import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { invoiceFileSlug, sendInvoiceEmail } from "../_shared/invoice.ts";
import {
  FXL_ENDPOINTS,
  fetchFakturaXLPdf,
  fxlRaw,
  listFakturaXLDocuments,
  pushInvoiceToFakturaXL,
  readFakturaXLDocument,
} from "../_shared/fakturaxl.ts";

/** FakturaXL `typ_faktury` value for a correction document. */
const FXL_CORRECTION_TYPE = 4;




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
async function syncInvoiceRow(
  admin: any,
  row: any,
  opts: { allowDelete?: boolean } = {},
): Promise<SyncOutcome> {
  const allowDelete = opts.allowDelete !== false;
  const base = {
    invoice_id: row.id,
    invoice_number: row.invoice_number,
    doc_type: row.doc_type,
  };

  const removeLocally = async (reason: string): Promise<SyncOutcome> => {
    if (!allowDelete) return { ...base, status: "failed", issue: reason };
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

    const sign = row.doc_type === "FK" || Number(row.gross_amount ?? 0) < 0 ? -1 : 1;
    if (details.gross != null) {
      const remoteGross = Math.round(Math.abs(details.gross) * 100) * sign;
      if (remoteGross !== Number(row.gross_amount ?? 0)) {
        patch.gross_amount = remoteGross;
        changes.push(
          `gross ${(Number(row.gross_amount ?? 0) / 100).toFixed(2)} → ${(remoteGross / 100).toFixed(2)}`,
        );
      }
    }
    if (details.net != null) patch.net_amount = Math.round(Math.abs(details.net) * 100) * sign;
    if (details.vat != null) patch.vat_amount = Math.round(Math.abs(details.vat) * 100) * sign;

    // Corrections carry their refund semantics from FakturaXL: the document total
    // is the difference, `powinno_byc` is the amount that should remain.
    if (row.doc_type === "FK") {
      const corr = correctionAmounts(details);
      if (corr.refundable != null && corr.refundable !== Number(row.refundable_amount ?? -1)) {
        patch.refundable_amount = corr.refundable;
        changes.push(
          `refundable ${(Number(row.refundable_amount ?? 0) / 100).toFixed(2)} → ${(corr.refundable / 100).toFixed(2)}`,
        );
      }
      if (
        corr.correctedTotal != null &&
        corr.correctedTotal !== Number(row.corrected_total_amount ?? -1)
      ) {
        patch.corrected_total_amount = corr.correctedTotal;
        changes.push(`corrected total → ${(corr.correctedTotal / 100).toFixed(2)}`);
      }
      if (details.correction_reason && details.correction_reason !== row.refund_reason) {
        patch.refund_reason = details.correction_reason;
      }
      if (details.line_items.length) patch.line_items = details.line_items;
      if (!row.settlement_status) patch.settlement_status = "awaiting";
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
    const vatCents = Number(patch.vat_amount ?? row.vat_amount ?? 0);
    patch.vat_amount_pln =
      needsRate && details.exchange_rate
        ? Math.round(vatCents * Number(details.exchange_rate))
        : vatCents;
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

/**
 * Refund semantics of a FakturaXL correction, in cents.
 *
 * `faktura_pozycje_bylo` is the state before, `faktura_pozycje_powinno_byc` the
 * state that should remain, and the document total is the difference between
 * them (negative). A correction chain works naturally: the second correction's
 * "was" is the first one's "should be".
 */
function correctionAmounts(details: any): {
  refundable: number | null;
  correctedTotal: number | null;
} {
  const cents = (v: number | null | undefined) =>
    v == null ? null : Math.round(Math.abs(Number(v)) * 100);
  const was = cents(details.was_gross);
  const should = cents(details.should_be_gross);
  if (was != null && should != null) {
    return { refundable: Math.max(0, was - should), correctedTotal: should };
  }
  // Full correction: FakturaXL infers the blocks, so only the total is present.
  const total = cents(details.gross);
  return { refundable: total, correctedTotal: total != null ? 0 : null };
}

/**
 * Imports corrections that were issued by hand in the FakturaXL panel.
 *
 * Linking is by `id_faktury_korygowanej` → our `invoices.fxl_document_id`, which
 * is the authoritative pointer FakturaXL stores on every correction. Nothing is
 * written back to FakturaXL, and the FK number always comes from there.
 */
async function importCorrection(
  admin: any,
  entry: { document_id: string | null; invoice_number: string | null },
): Promise<{ invoice_number: string | null; status: string; issue?: string }> {
  const documentId = entry.document_id;
  if (!documentId) {
    return { invoice_number: entry.invoice_number, status: "skipped", issue: "no document id" };
  }

  const details = await readFakturaXLDocument(documentId);
  if (!details) {
    return { invoice_number: entry.invoice_number, status: "skipped", issue: "could not be read" };
  }

  const parentId = details.corrects_document_id ?? details.related_document_ids[0] ?? null;
  if (!parentId) {
    return {
      invoice_number: details.invoice_number,
      status: "skipped",
      issue: "correction has no corrected document",
    };
  }

  // A chain corrects the previous correction; the sale is always the FV at the root.
  let cursor: any = null;
  let lookupId: string | null = parentId;
  for (let hop = 0; hop < 5 && lookupId; hop++) {
    const { data } = await admin
      .from("invoices")
      .select("*")
      .eq("fxl_document_id", lookupId)
      .maybeSingle();
    if (!data) break;
    cursor = data;
    if (data.doc_type === "FV") break;
    lookupId = data.original_invoice_id
      ? (
          await admin
            .from("invoices")
            .select("fxl_document_id")
            .eq("id", data.original_invoice_id)
            .maybeSingle()
        ).data?.fxl_document_id ?? null
      : null;
  }

  if (!cursor || cursor.doc_type !== "FV") {
    return {
      invoice_number: details.invoice_number,
      status: "skipped",
      issue: "corrected sale is not in this system",
    };
  }

  const original = cursor;
  const { refundable, correctedTotal } = correctionAmounts(details);
  const currency = (details.currency ?? original.currency ?? "EUR").toUpperCase();
  const needsRate = currency !== "PLN";
  const grossCents = -(Math.round(Math.abs(Number(details.gross ?? 0)) * 100) || (refundable ?? 0));
  const netCents =
    details.net != null ? -Math.round(Math.abs(details.net) * 100) : null;
  const vatCents = details.vat != null ? -Math.round(Math.abs(details.vat) * 100) : null;

  const row = {
    invoice_number: details.invoice_number,
    doc_type: "FK",
    original_invoice_id: original.id,
    user_id: original.user_id,
    course_id: original.course_id,
    purchase_type: original.purchase_type,
    course_purchase_id: original.course_purchase_id,
    retake_purchase_id: original.retake_purchase_id,
    stripe_session_id: original.stripe_session_id,
    stripe_payment_intent_id: original.stripe_payment_intent_id,
    buyer_name: original.buyer_name,
    buyer_company: original.buyer_company,
    buyer_email: original.buyer_email,
    buyer_address_line1: original.buyer_address_line1,
    buyer_address_line2: original.buyer_address_line2,
    buyer_postal_code: original.buyer_postal_code,
    buyer_city: original.buyer_city,
    buyer_country: original.buyer_country,
    buyer_vat_id: original.buyer_vat_id,
    seller: original.seller,
    line_items: details.line_items.length ? details.line_items : original.line_items,
    currency,
    vat_rate: details.vat_rate ?? original.vat_rate,
    reverse_charge: original.reverse_charge,
    net_amount: netCents ?? grossCents,
    vat_amount: vatCents ?? 0,
    gross_amount: grossCents,
    refund_reason: details.correction_reason,
    issued_at: `${details.issued_date ?? new Date().toISOString().slice(0, 10)}T12:00:00Z`,
    fxl_document_id: documentId,
    fxl_status: "synced",
    fxl_exchange_rate: needsRate ? details.exchange_rate : null,
    fxl_nbp_table: needsRate ? details.nbp_table : null,
    fxl_rate_date: needsRate ? details.rate_date : null,
    vat_amount_pln:
      needsRate && details.exchange_rate
        ? Math.round((vatCents ?? 0) * Number(details.exchange_rate))
        : vatCents ?? 0,
    payment_due_date: details.due_date,
    discovered_from_fxl: true,
    settlement_status: "awaiting",
    refundable_amount: refundable,
    corrected_total_amount: correctedTotal,
  };

  const { data: inserted, error: insertError } = await admin
    .from("invoices")
    .insert(row)
    .select("id, invoice_number")
    .maybeSingle();
  if (insertError) {
    return {
      invoice_number: details.invoice_number,
      status: "failed",
      issue: insertError.message,
    };
  }

  // FakturaXL's own PDF, same as for invoices — one document per number.
  try {
    const path = `${invoiceFileSlug(String(details.invoice_number))}.pdf`;
    const pdf = await fetchFakturaXLPdf(documentId);
    const { error: uploadError } = await admin.storage
      .from("invoices")
      .upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    await admin.from("invoices").update({ pdf_path: path }).eq("id", inserted!.id);
  } catch (e) {
    await admin
      .from("invoices")
      .update({ fxl_status: "pdf_pending", ksef_error_desc: (e as Error).message })
      .eq("id", inserted!.id);
  }

  return { invoice_number: details.invoice_number, status: "imported" };
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
    if (["fxl_read", "fxl_orphans", "fxl_sync_all"].includes(rawAction)) {
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

      // Full repair pass over a date range: FakturaXL is the single source of
      // truth, so every difference is corrected here (values, PDF) or the row is
      // removed. Nothing is created or changed in FakturaXL.
      const now = new Date();
      const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
      const from = isDate(body?.from)
        ? String(body.from)
        : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
      const to = isDate(body?.to) ? String(body.to) : now.toISOString().slice(0, 10);

      const { data: rangeRows } = await admin
        .from("invoices")
        .select("*")
        .gte("issued_at", `${from}T00:00:00Z`)
        .lte("issued_at", `${to}T23:59:59Z`)
        .order("issued_at", { ascending: false });

      // Corrections first so a parent row can be deleted without leaving a
      // dangling original_invoice_id reference.
      const rows = [...(rangeRows ?? [])].sort((a: any, b: any) =>
        a.doc_type === b.doc_type ? 0 : a.doc_type === "FK" ? -1 : 1,
      );

      const results: SyncOutcome[] = [];
      for (const row of rows) {
        results.push(await syncInvoiceRow(admin, row));
      }

      // Corrections issued by hand in the FakturaXL panel are imported here; any
      // other document that exists only there is reported, never imported —
      // there is no purchase in this system to attach it to.
      const docs = await listFakturaXLDocuments(from, to).catch(() => []);

      const orphans: any[] = [];
      const imported: any[] = [];
      if (docs.length) {
        const numbers = docs.map((d) => String(d.invoice_number));
        const { data: known } = await admin
          .from("invoices")
          .select("invoice_number")
          .in("invoice_number", numbers);
        const knownSet = new Set((known ?? []).map((r: any) => r.invoice_number));
        for (const d of docs) {
          if (knownSet.has(String(d.invoice_number))) continue;
          if (d.doc_kind === FXL_CORRECTION_TYPE) {
            imported.push(await importCorrection(admin, d));
            continue;
          }
          orphans.push({
            document_id: d.document_id,
            invoice_number: d.invoice_number,
            issued_at: d.issued_date,
            gross: d.gross != null ? d.gross.toFixed(2) : null,
          });
        }
      }

      // Refunds made straight in Stripe without a matching correction in
      // FakturaXL are surfaced so the books can be put right.
      const { data: unmatchedRows } = await admin
        .from("invoices")
        .select("id, invoice_number, gross_amount, stripe_refunded_amount, currency")
        .eq("doc_type", "FV")
        .gt("stripe_refunded_amount", 0);
      const unmatchedRefunds: any[] = [];
      for (const fv of unmatchedRows ?? []) {
        const { data: fks } = await admin
          .from("invoices")
          .select("refundable_amount, gross_amount")
          .eq("original_invoice_id", fv.id)
          .eq("doc_type", "FK");
        const credited = (fks ?? []).reduce(
          (sum: number, c: any) =>
            sum + Math.abs(Number(c.refundable_amount ?? c.gross_amount ?? 0)),
          0,
        );
        const gap = Number(fv.stripe_refunded_amount ?? 0) - credited;
        if (gap > 0) {
          unmatchedRefunds.push({
            invoice_number: fv.invoice_number,
            currency: fv.currency,
            refunded_in_stripe: Number(fv.stripe_refunded_amount ?? 0),
            credited_by_corrections: credited,
            missing_correction_for: gap,
          });
        }
      }

      return json({
        ok: results.every((r) => r.status !== "failed"),
        from,
        to,
        checked: results.length,
        listing_available: docs.length > 0,
        updated: results.filter((r) => r.status === "updated"),
        unchanged: results.filter((r) => r.status === "unchanged").length,
        deleted: results.filter((r) => r.status === "deleted"),
        failed: results.filter((r) => r.status === "failed"),
        imported,
        orphans,
        unmatched_refunds: unmatchedRefunds,
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
    // FakturaXL and replace what we store. Never creates a new document, and
    // never deletes a row — that only happens in the full sync pass.
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
        const outcome = await syncInvoiceRow(admin, row, { allowDelete: false });
        results.push({
          invoice_number: outcome.invoice_number,
          doc_type: outcome.doc_type,
          status: outcome.status === "failed" ? "failed" : "synced",
          changes: outcome.changes,
          issue: outcome.issue,
        });
      }

      // A correction issued by hand in FakturaXL shows up on the invoice's
      // relations, so syncing a single sale picks it up without a full pass.
      const imported: any[] = [];
      if (invoice.doc_type === "FV" && invoice.fxl_document_id) {
        const parentDetails = await readFakturaXLDocument(String(invoice.fxl_document_id)).catch(
          () => null,
        );
        for (const relatedId of parentDetails?.related_document_ids ?? []) {
          const { data: existing } = await admin
            .from("invoices")
            .select("id")
            .eq("fxl_document_id", relatedId)
            .maybeSingle();
          if (existing) continue;
          imported.push(await importCorrection(admin, { document_id: relatedId, invoice_number: null }));
        }
      }

      return json({ ok: results.every((r) => r.status !== "failed"), results, imported });
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
