import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { invoiceFileSlug, renderInvoicePdf, sendInvoiceEmail } from "../_shared/invoice.ts";
import {
  FXL_ENDPOINTS,
  cdata,
  fxl,
  fxlRaw,
  pushInvoiceToKsef,
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


      // Orphan check: FakturaXL documents with no matching invoices row.
      const now = new Date();
      const from = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
      const to = now.toISOString().slice(0, 10);
      const rawXml = await fxlRaw(
        FXL_ENDPOINTS.listDocuments,
        `  <data_dodania_od>${cdata(from)}</data_dodania_od>
  <data_dodania_do>${cdata(to)}</data_dodania_do>`,
        String(body?.root ?? "dokumenty"),
      );
      const parsed = xmlToObject(rawXml);
      const container = parsed?.dokumenty ?? parsed?.dokument ?? parsed ?? {};
      const listRaw = container?.dokument ?? container?.faktura ?? [];
      const docs = (Array.isArray(listRaw) ? listRaw : [listRaw]).filter(
        (d: any) => d && typeof d === "object",
      );
      const numbers = docs
        .map((d: any) => (d?.numer_faktury != null ? String(d.numer_faktury) : ""))
        .filter(Boolean);

      const { data: known } = await admin
        .from("invoices")
        .select("invoice_number")
        .in("invoice_number", numbers.length ? numbers : ["__none__"]);
      const knownSet = new Set((known ?? []).map((r: any) => r.invoice_number));

      const orphans = docs
        .filter((d: any) => d?.numer_faktury && !knownSet.has(String(d.numer_faktury)))
        .map((d: any) => ({
          document_id: d?.dokument_id != null ? String(d.dokument_id) : null,
          invoice_number: String(d.numer_faktury),
          issued_at: d?.data_wystawienia != null ? String(d.data_wystawienia) : null,
          buyer: d?.nabywca?.nazwa != null ? String(d.nabywca.nazwa) : null,
          gross: d?.wartosc_brutto != null ? String(d.wartosc_brutto) : null,
        }));

      return json({
        ok: true,
        from,
        to,
        checked: docs.length,
        orphans,
        code: container?.kod ?? null,
        ...(body?.debug ? { raw: rawXml.slice(0, 4000) } : {}),
      });

    }

    const action =
      rawAction === "resend" ? "resend" : rawAction === "retry_ksef" ? "retry_ksef" : "regenerate";
    if (!invoiceId) return json({ error: "invoiceId is required" }, 400);


    const { data: invoice } = await admin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();
    if (!invoice) return json({ error: "Invoice not found" }, 404);
    if (!isAdmin && invoice.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    if (action === "retry_ksef") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      await pushInvoiceToKsef(admin, invoice);
      const { data: refreshed } = await admin
        .from("invoices")
        .select("ksef_status, ksef_number, ksef_error_code, ksef_error_desc, fxl_document_id")
        .eq("id", invoice.id)
        .maybeSingle();
      return json({ ok: true, ...(refreshed ?? {}) });
    }

    const { data: originalRef } = invoice.original_invoice_id
      ? await admin
          .from("invoices")
          .select("invoice_number")
          .eq("id", invoice.original_invoice_id)
          .maybeSingle()
      : { data: null };

    const path = invoice.pdf_path ?? `${invoiceFileSlug(invoice.invoice_number)}.pdf`;
    let pdf: Uint8Array | null = null;

    if (invoice.pdf_path && action === "resend") {
      const { data: file } = await admin.storage.from("invoices").download(invoice.pdf_path);
      if (file) pdf = new Uint8Array(await file.arrayBuffer());
    }

    if (!pdf) {
      pdf = await renderInvoicePdf({
        ...(invoice as any),
        original_invoice_number: originalRef?.invoice_number ?? null,
      });
      await admin.storage
        .from("invoices")
        .upload(path, pdf, { contentType: "application/pdf", upsert: true });
      await admin.from("invoices").update({ pdf_path: path }).eq("id", invoice.id);
    }

    if (action === "resend") {
      if (!invoice.buyer_email) return json({ error: "No buyer email on this invoice" }, 400);
      await sendInvoiceEmail(invoice.buyer_email, invoice.invoice_number, pdf, invoice.doc_type);
    }

    return json({ ok: true, pdf_path: path });
  } catch (error) {
    console.error("invoice-actions error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
