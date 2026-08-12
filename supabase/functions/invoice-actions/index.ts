import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { invoiceFileSlug, sendInvoiceEmail } from "../_shared/invoice.ts";
import {
  FXL_ENDPOINTS,
  fetchFakturaXLPdf,
  fxlRaw,
  xmlToObject,
  pushInvoiceToFakturaXL,
  readFakturaXLDocument,
} from "../_shared/fakturaxl.ts";



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type SyncOutcome = {
  invoice_id: string;
  invoice_number: string;
  doc_type: string;
  status: "updated" | "unchanged" | "deleted" | "failed";
  changes?: string[];
  issue?: string;
};

/**
 * Brings a single invoice row in line with FakturaXL, which is the single source
 * of truth. Only read endpoints are used against FakturaXL — every write happens
 * on our side: field values, the stored PDF, or deleting the row entirely when
 * the document does not exist there (or was never created).
 */
async function syncInvoiceRow(admin: any, row: any): Promise<SyncOutcome> {
  const base = {
    invoice_id: row.id,
    invoice_number: row.invoice_number,
    doc_type: row.doc_type,
  };

  const removeLocally = async (reason: string): Promise<SyncOutcome> => {
    if (row.pdf_path) {
      await admin.storage.from("invoices").remove([row.pdf_path]).catch(() => {});
    }
    const { error: deleteError } = await admin.from("invoices").delete().eq("id", row.id);
    if (deleteError) {
      return { ...base, status: "failed", issue: `could not delete: ${deleteError.message}` };
    }
    return { ...base, status: "deleted", issue: reason };
  };

  if (!row.fxl_document_id) {
    return await removeLocally("never created in FakturaXL");
  }

  try {
    const details = await readFakturaXLDocument(String(row.fxl_document_id));
    if (!details) return await removeLocally("no longer exists in FakturaXL");

    const changes: string[] = [];
    const patch: Record<string, unknown> = { fxl_status: "synced" };

    if (details.invoice_number && details.invoice_number !== row.invoice_number) {
      patch.invoice_number = details.invoice_number;
      changes.push(`number ${row.invoice_number} → ${details.invoice_number}`);
    }

    const sign = Number(row.gross_amount ?? 0) < 0 ? -1 : 1;
    if (details.gross != null) {
      const remoteGross = Math.round(Math.abs(details.gross) * 100) * sign;
      if (remoteGross !== Number(row.gross_amount ?? 0)) {
        patch.gross_amount = remoteGross;
        changes.push(
          `gross ${(Number(row.gross_amount ?? 0) / 100).toFixed(2)} → ${(remoteGross / 100).toFixed(2)}`,
        );
      }
    }

    const currency = (details.currency ?? row.currency ?? "EUR").toUpperCase();
    if (currency !== String(row.currency ?? "").toUpperCase()) {
      patch.currency = currency;
      changes.push(`currency ${row.currency} → ${currency}`);
    }

    const needsRate = currency !== "PLN";
    patch.fxl_exchange_rate = needsRate ? details.exchange_rate : null;
    patch.fxl_nbp_table = needsRate ? details.nbp_table : null;
    patch.fxl_rate_date = needsRate ? details.rate_date : null;
    patch.vat_amount_pln =
      needsRate && details.exchange_rate
        ? Math.round(Number(row.vat_amount ?? 0) * Number(details.exchange_rate))
        : Number(row.vat_amount ?? 0);
    if (details.due_date && details.due_date !== row.payment_due_date) {
      patch.payment_due_date = details.due_date;
      changes.push(`due date ${row.payment_due_date ?? "—"} → ${details.due_date}`);
    }
    if (
      needsRate &&
      details.exchange_rate != null &&
      Number(details.exchange_rate) !== Number(row.fxl_exchange_rate ?? 0)
    ) {
      changes.push(`rate ${row.fxl_exchange_rate ?? "—"} → ${details.exchange_rate}`);
    }

    const targetPath =
      row.pdf_path ?? `${invoiceFileSlug(String(patch.invoice_number ?? row.invoice_number))}.pdf`;

    const pdf = await fetchFakturaXLPdf(String(row.fxl_document_id));
    const { error: uploadError } = await admin.storage
      .from("invoices")
      .upload(targetPath, pdf, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    patch.pdf_path = targetPath;

    await admin.from("invoices").update(patch).eq("id", row.id);

    return {
      ...base,
      invoice_number: String(patch.invoice_number ?? row.invoice_number),
      status: changes.length ? "updated" : "unchanged",
      changes,
    };
  } catch (e) {
    await admin
      .from("invoices")
      .update({ fxl_status: "pdf_pending", ksef_error_desc: (e as Error).message })
      .eq("id", row.id);
    return { ...base, status: "failed", issue: (e as Error).message };
  }
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await userClient.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });

    const body = await req.json().catch(() => ({}));
    const invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId : null;
    const rawAction = String(body?.action ?? "");

    // Admin-only FakturaXL maintenance actions (no invoiceId).
    if (["fxl_read", "fxl_orphans"].includes(rawAction)) {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);

      if (rawAction === "fxl_read") {
        const documentId = String(body?.documentId ?? "").trim();
        if (!/^\d+$/.test(documentId)) return json({ error: "documentId is required" }, 400);
        const raw = await fxlRaw(
          FXL_ENDPOINTS.readDocument,
          `  <dokument_id>${documentId}</dokument_id>`,
        );
        return json({ ok: true, endpoint: FXL_ENDPOINTS.readDocument, raw });
      }


      // Drift check between FakturaXL and our invoices table for the current month.
      const now = new Date();
      const from = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
      const to = now.toISOString().slice(0, 10);

      const listXml = await fxlRaw(
        FXL_ENDPOINTS.listDocuments,
        `  <data_od>${from}</data_od>
  <data_do>${to}</data_do>`,
        "dokumenty",
      ).catch(() => "");
      const parsed = listXml ? xmlToObject(listXml) : {};
      const container = parsed?.dokumenty ?? parsed?.dokument ?? {};
      const listRaw = container?.dokument ?? container?.faktura ?? [];
      const docs = (Array.isArray(listRaw) ? listRaw : [listRaw]).filter(
        (d: any) => d && typeof d === "object" && d?.numer_faktury != null,
      );
      const listCode = container?.kod != null ? String(container.kod) : null;

      // Forward direction (only possible when listing is permitted by the plan):
      // FakturaXL documents with no matching invoices row.
      const orphans: any[] = [];
      if (docs.length) {
        const numbers = docs.map((d: any) => String(d.numer_faktury));
        const { data: known } = await admin
          .from("invoices")
          .select("invoice_number")
          .in("invoice_number", numbers);
        const knownSet = new Set((known ?? []).map((r: any) => r.invoice_number));
        for (const d of docs) {
          if (knownSet.has(String(d.numer_faktury))) continue;
          orphans.push({
            document_id: d?.dokument_id != null ? String(d.dokument_id) : null,
            invoice_number: String(d.numer_faktury),
            issued_at: d?.data_wystawienia != null ? String(d.data_wystawienia) : null,
            gross: d?.wartosc_brutto != null ? String(d.wartosc_brutto) : null,
          });
        }
      }

      // Reverse direction (always available): our rows that reference a FakturaXL
      // document, verified one by one against dokument_odczytaj — number and gross.
      const { data: ourRows } = await admin
        .from("invoices")
        .select("id, invoice_number, doc_type, gross_amount, fxl_document_id")
        .not("fxl_document_id", "is", null)
        .gte("issued_at", `${from}T00:00:00Z`)
        .order("issued_at", { ascending: false })
        .limit(20);

      // Rows that never made it into FakturaXL at all.
      const { data: unsyncedRows } = await admin
        .from("invoices")
        .select("id, invoice_number, doc_type, gross_amount, fxl_status, ksef_error_desc")
        .is("fxl_document_id", null)
        .gte("issued_at", `${from}T00:00:00Z`)
        .order("issued_at", { ascending: false });

      const unsynced = (unsyncedRows ?? []).map((r: any) => ({
        invoice_id: r.id,
        invoice_number: r.invoice_number,
        doc_type: r.doc_type,
        status: r.fxl_status,
        issue: r.ksef_error_desc ?? "not created in FakturaXL",
      }));

      const mismatches: any[] = [];
      let verified = 0;
      for (const row of ourRows ?? []) {
        const raw = await fxlRaw(
          FXL_ENDPOINTS.readDocument,
          `  <dokument_id>${row.fxl_document_id}</dokument_id>`,
        ).catch(() => "");
        const doc = raw ? (xmlToObject(raw)?.dokument ?? {}) : {};
        const remoteNumber = doc?.numer_faktury != null ? String(doc.numer_faktury) : null;
        const remoteGrossRaw =
          doc?.wartosc_brutto ?? doc?.brutto ?? doc?.kwota_brutto ?? null;
        const remoteGross =
          remoteGrossRaw != null
            ? Math.round(Number(String(remoteGrossRaw).replace(",", ".")) * 100)
            : null;
        const base = {
          invoice_id: row.id,
          invoice_number: row.invoice_number,
          doc_type: row.doc_type,
          document_id: String(row.fxl_document_id),
        };

        if (!remoteNumber) {
          mismatches.push({ ...base, issue: "not found in FakturaXL" });
        } else if (remoteNumber !== row.invoice_number) {
          mismatches.push({ ...base, issue: `number differs in FakturaXL: ${remoteNumber}` });
        } else if (
          remoteGross != null &&
          Math.abs(remoteGross) !== Math.abs(Number(row.gross_amount ?? 0))
        ) {
          mismatches.push({
            ...base,
            issue: `gross differs: ours ${(Number(row.gross_amount ?? 0) / 100).toFixed(2)}, FakturaXL ${(remoteGross / 100).toFixed(2)}`,
          });
        } else {
          verified += 1;
        }
        await new Promise((r) => setTimeout(r, 1100));
      }

      return json({
        ok: true,
        from,
        to,
        listing_available: docs.length > 0,
        list_code: listCode,
        listed: docs.length,
        orphans,
        verified,
        mismatches,
        unsynced,
      });



    }

    const action = ["resend", "retry_ksef", "signed_url", "sync_fxl"].includes(rawAction)
      ? rawAction
      : "regenerate";
    if (!invoiceId) return json({ error: "invoiceId is required" }, 400);



    const { data: invoice } = await admin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();
    if (!invoice) return json({ error: "Invoice not found" }, 404);
    if (!isAdmin && invoice.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    // Owner (or admin) download: the bucket stays private and pdf_path is never
    // returned to the browser — only a short-lived signed URL.
    if (action === "signed_url") {
      if (!invoice.pdf_path) {
        return json({ error: "This invoice is still being issued", pending: true }, 409);
      }
      const { data: signed, error: signError } = await admin.storage
        .from("invoices")
        .createSignedUrl(invoice.pdf_path, 120, {
          download: `${invoiceFileSlug(invoice.invoice_number)}.pdf`,
        });
      if (signError || !signed?.signedUrl) {
        return json({ error: signError?.message ?? "Could not create download link" }, 500);
      }
      return json({ ok: true, url: signed.signedUrl });
    }

    // Pull the latest version of the document (and its corrections) back from
    // FakturaXL and replace what we store. Never creates a new document.
    if (action === "sync_fxl") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);

      const { data: linked } = await admin
        .from("invoices")
        .select("*")
        .eq("original_invoice_id", invoice.id);

      const rows = [invoice, ...((linked ?? []) as any[])];
      const results: any[] = [];

      for (const row of rows) {
        if (!row.fxl_document_id) {
          results.push({
            invoice_number: row.invoice_number,
            doc_type: row.doc_type,
            status: "skipped",
            issue: "not in FakturaXL yet",
          });
          continue;
        }

        try {
          const details = await readFakturaXLDocument(String(row.fxl_document_id));
          if (!details) throw new Error("document not found in FakturaXL");

          const changes: string[] = [];
          const patch: Record<string, unknown> = { fxl_status: "synced" };

          if (details.invoice_number && details.invoice_number !== row.invoice_number) {
            patch.invoice_number = details.invoice_number;
            changes.push(`number ${row.invoice_number} → ${details.invoice_number}`);
          }

          const sign = Number(row.gross_amount ?? 0) < 0 ? -1 : 1;
          if (details.gross != null) {
            const remoteGross = Math.round(Math.abs(details.gross) * 100) * sign;
            if (remoteGross !== Number(row.gross_amount ?? 0)) {
              patch.gross_amount = remoteGross;
              changes.push(
                `gross ${(Number(row.gross_amount ?? 0) / 100).toFixed(2)} → ${(remoteGross / 100).toFixed(2)}`,
              );
            }
          }

          const currency = (details.currency ?? row.currency ?? "EUR").toUpperCase();
          if (currency !== String(row.currency ?? "").toUpperCase()) {
            patch.currency = currency;
            changes.push(`currency ${row.currency} → ${currency}`);
          }

          const needsRate = currency !== "PLN";
          patch.fxl_exchange_rate = needsRate ? details.exchange_rate : null;
          patch.fxl_nbp_table = needsRate ? details.nbp_table : null;
          patch.fxl_rate_date = needsRate ? details.rate_date : null;
          patch.vat_amount_pln =
            needsRate && details.exchange_rate
              ? Math.round(Number(row.vat_amount ?? 0) * Number(details.exchange_rate))
              : Number(row.vat_amount ?? 0);
          if (details.due_date) patch.payment_due_date = details.due_date;

          const targetPath =
            row.pdf_path ??
            `${invoiceFileSlug(String(patch.invoice_number ?? row.invoice_number))}.pdf`;

          const pdf = await fetchFakturaXLPdf(String(row.fxl_document_id));
          const { error: uploadError } = await admin.storage
            .from("invoices")
            .upload(targetPath, pdf, { contentType: "application/pdf", upsert: true });
          if (uploadError) throw new Error(uploadError.message);
          patch.pdf_path = targetPath;

          await admin.from("invoices").update(patch).eq("id", row.id);

          results.push({
            invoice_number: patch.invoice_number ?? row.invoice_number,
            doc_type: row.doc_type,
            status: "synced",
            changes,
          });
        } catch (e) {
          await admin
            .from("invoices")
            .update({ fxl_status: "pdf_pending", ksef_error_desc: (e as Error).message })
            .eq("id", row.id);
          results.push({
            invoice_number: row.invoice_number,
            doc_type: row.doc_type,
            status: "failed",
            issue: (e as Error).message,
          });
        }
      }

      return json({ ok: results.every((r) => r.status !== "failed"), results });
    }

    if (action === "retry_ksef") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      await pushInvoiceToFakturaXL(admin, invoice);
      const { data: refreshed } = await admin
        .from("invoices")
        .select("ksef_status, ksef_number, ksef_error_code, ksef_error_desc, fxl_document_id")
        .eq("id", invoice.id)
        .maybeSingle();
      return json({ ok: true, ...(refreshed ?? {}) });
    }

    // "regenerate" re-fetches FakturaXL's own PDF for an existing document —
    // it never creates a new document, so the number can't be duplicated.
    const path = invoice.pdf_path ?? `${invoiceFileSlug(invoice.invoice_number)}.pdf`;

    if (!invoice.pdf_path || action === "regenerate") {
      if (!invoice.fxl_document_id) {
        return json(
          { error: "This invoice has no FakturaXL document yet — retry the sync first" },
          409,
        );
      }
      const pdf = await fetchFakturaXLPdf(String(invoice.fxl_document_id));
      const { error: uploadError } = await admin.storage
        .from("invoices")
        .upload(path, pdf, { contentType: "application/pdf", upsert: true });
      if (uploadError) return json({ error: uploadError.message }, 500);
      await admin
        .from("invoices")
        .update({ pdf_path: path, fxl_status: "synced" })
        .eq("id", invoice.id);
    }


    if (action === "resend") {
      if (!invoice.buyer_email) return json({ error: "No buyer email on this invoice" }, 400);
      await sendInvoiceEmail(admin, invoice, { resend: true });
    }

    return json({ ok: true, pdf_path: path });
  } catch (error) {
    console.error("invoice-actions error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
