// Shared invoicing helpers: VAT logic, FakturaXL PDF storage, email.
// The invoice PDF is always the document FakturaXL rendered — we never draw our
// own, so buyer and accountant see exactly one document per sale.
import {
  fetchFakturaXLPdf,
  pushInvoiceToFakturaXL,
  readFakturaXLDocument,
} from "./fakturaxl.ts";


export const EU_COUNTRIES = [
  "AT","BE","BG","CY","CZ","DE","DK","EE","ES","FI","FR","GR","HR","HU","IE",
  "IT","LT","LU","LV","MT","NL","PL","PT","RO","SE","SI","SK",
];

export type Buyer = {
  name?: string | null;
  company?: string | null;
  email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  vat_id?: string | null;
};

export type Seller = {
  name: string;
  address_line1: string;
  address_line2: string;
  country: string;
  nip: string;
  regon?: string;
  email?: string;
};

export const DEFAULT_SELLER: Seller = {
  name: "Praktyka Lekarska Cezary Chudobiński",
  address_line1: "ul. Bursztynowa 2",
  address_line2: "95-050 Konstantynów Łódzki",
  country: "PL",
  nip: "8291244164",
  regon: "731020643",
  email: "cert@lnrads.com",
};

/** Reverse charge: EU business outside Poland with a VAT ID. */
export function isReverseCharge(buyer: Buyer): boolean {
  const country = (buyer.country ?? "").toUpperCase();
  const vatId = (buyer.vat_id ?? "").trim();
  return Boolean(vatId) && country !== "PL" && EU_COUNTRIES.includes(country);
}

/** Prices are gross; VAT is extracted backwards. Amounts in cents. */
export function computeAmounts(grossCents: number, buyer: Buyer, standardRate = 23) {
  const reverse = isReverseCharge(buyer);
  const rate = reverse ? 0 : standardRate;
  const net = Math.round(grossCents / (1 + rate / 100));
  return {
    reverse_charge: reverse,
    vat_rate: rate,
    net_amount: net,
    vat_amount: grossCents - net,
    gross_amount: grossCents,
  };
}

/** Filesystem-safe slug for invoice numbers like "FV EDU/15/08/2026" -> "FV-EDU-15-08-2026". */
export const invoiceFileSlug = (invoiceNumber: string) =>
  invoiceNumber.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");


export async function getSeller(admin: any): Promise<Seller> {
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "invoice_seller")
    .maybeSingle();
  return { ...DEFAULT_SELLER, ...(data?.value ?? {}) };
}

export async function getVatRate(admin: any): Promise<number> {
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "invoice_vat_rate")
    .maybeSingle();
  const raw = Number(data?.value);
  return Number.isFinite(raw) && raw >= 0 ? raw : 23;
}

/**
 * Creates an invoice row, renders the PDF, uploads it and (optionally) emails the buyer.
 */
export async function createInvoice(
  admin: any,
  params: {
    docType?: "FV" | "FK";
    originalInvoiceId?: string | null;
    originalInvoiceNumber?: string | null;
    userId?: string | null;
    courseId?: string | null;
    purchaseType?: string;
    coursePurchaseId?: string | null;
    retakePurchaseId?: string | null;
    stripeSessionId?: string | null;
    stripePaymentIntentId?: string | null;
    buyer: Buyer;
    lineItems: { description: string; quantity: number; gross: number }[];
    grossCents: number;
    /** Exact figures as charged by Stripe (Stripe Tax); overrides backwards VAT extraction. */
    netCents?: number | null;
    vatCents?: number | null;
    vatRate?: number | null;
    currency?: string;
    discountCodeId?: string | null;
    discountSummary?: string | null;
    refundReason?: string | null;
    notes?: string | null;
    email?: boolean;
  },
) {
  const docType = params.docType ?? "FV";
  const currency = (params.currency ?? "eur").toLowerCase();
  const [seller, standardRate] = await Promise.all([getSeller(admin), getVatRate(admin)]);
  const derived = computeAmounts(params.grossCents, params.buyer, standardRate);
  // Prefer what Stripe actually charged, so invoice and payment always match.
  const amounts =
    params.netCents != null && params.vatCents != null
      ? {
          reverse_charge: Number(params.vatCents) === 0 && derived.reverse_charge,
          vat_rate:
            params.vatRate != null
              ? Number(params.vatRate)
              : Number(params.netCents) !== 0
              ? Math.round((Number(params.vatCents) / Number(params.netCents)) * 100)
              : 0,
          net_amount: Number(params.netCents),
          vat_amount: Number(params.vatCents),
          gross_amount: params.grossCents,
        }
      : derived;

  if (
    params.grossCents > 0 &&
    !derived.reverse_charge &&
    amounts.vat_amount === 0 &&
    standardRate > 0
  ) {
    throw new Error(
      `VAT mismatch: 0% received for a non-reverse-charge buyer in ${params.buyer.country ?? "unknown country"}; expected ${standardRate}%`,
    );
  }

  const { data: numberData, error: numberError } = await admin.rpc("next_invoice_number", {
    _doc_type: docType,
  });
  if (numberError) throw new Error(`Invoice numbering failed: ${numberError.message}`);
  const invoiceNumber = numberData as string;

  const row = {
    invoice_number: invoiceNumber,
    doc_type: docType,
    original_invoice_id: params.originalInvoiceId ?? null,
    user_id: params.userId ?? null,
    course_id: params.courseId ?? null,
    purchase_type: params.purchaseType ?? "course",
    course_purchase_id: params.coursePurchaseId ?? null,
    retake_purchase_id: params.retakePurchaseId ?? null,
    stripe_session_id: params.stripeSessionId ?? null,
    stripe_payment_intent_id: params.stripePaymentIntentId ?? null,
    buyer_name: params.buyer.name ?? null,
    buyer_company: params.buyer.company ?? null,
    buyer_email: params.buyer.email ?? null,
    buyer_address_line1: params.buyer.address_line1 ?? null,
    buyer_address_line2: params.buyer.address_line2 ?? null,
    buyer_postal_code: params.buyer.postal_code ?? null,
    buyer_city: params.buyer.city ?? null,
    buyer_country: params.buyer.country ?? null,
    buyer_vat_id: params.buyer.vat_id ?? null,
    seller,
    line_items: params.lineItems,
    currency,
    vat_rate: amounts.vat_rate,
    reverse_charge: amounts.reverse_charge,
    net_amount: amounts.net_amount,
    vat_amount: amounts.vat_amount,
    gross_amount: amounts.gross_amount,
    discount_code_id: params.discountCodeId ?? null,
    discount_summary: params.discountSummary ?? null,
    refund_reason: params.refundReason ?? null,
    notes: params.notes ?? null,
    fxl_status: "pending",
    issued_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await admin
    .from("invoices")
    .insert(row)
    .select()
    .single();
  if (insertError) throw new Error(`Invoice insert failed: ${insertError.message}`);

  // FakturaXL first: the exchange rate and payment due date only exist once the
  // document has been created there, and our PDF must be a faithful copy of it.
  const finalized = await finalizeInvoice(admin, inserted, {
    originalInvoiceNumber: params.originalInvoiceNumber ?? null,
    email: params.email !== false,
  });

  return { ...inserted, ...finalized };
}

/**
 * Steps 3-8 of the invoice pipeline: push to FakturaXL, read the created document
 * back, store the NBP rate, then download FakturaXL's own PDF, store it and email
 * the buyer a link.
 *
 * Failure states are deliberately distinct so a retry never duplicates a
 * document number (kod=7):
 *  - `pending`     — no FakturaXL document yet, the whole push may be retried.
 *  - `pdf_pending` — the document exists; only the PDF download is retried.
 */
export async function finalizeInvoice(
  admin: any,
  invoiceRow: any,
  opts: { originalInvoiceNumber?: string | null; email?: boolean } = {},
): Promise<{ pdf_path?: string; pdf?: Uint8Array; fxl_status: string; error?: string }> {
  const invoiceId = invoiceRow.id;
  const fail = async (error: string, status: "pending" | "pdf_pending" = "pending") => {
    console.error(`Invoice ${invoiceRow.invoice_number} ${status}:`, error);
    await admin.from("invoices").update({ fxl_status: status }).eq("id", invoiceId);
    return { fxl_status: status, error };
  };

  let documentId: string | null = invoiceRow.fxl_document_id ?? null;
  if (!documentId) {
    try {
      await pushInvoiceToFakturaXL(admin, invoiceRow);
    } catch (e) {
      return await fail(`FakturaXL push threw: ${(e as Error).message}`);
    }
    const { data: pushed } = await admin
      .from("invoices")
      .select("fxl_document_id, ksef_error_code, ksef_error_desc")
      .eq("id", invoiceId)
      .maybeSingle();
    documentId = pushed?.fxl_document_id ?? null;
    if (!documentId) {
      return await fail(
        `FakturaXL did not create the document: ${pushed?.ksef_error_desc ?? "unknown error"}`,
      );
    }
  }

  // From here on the document exists in FakturaXL: every failure is PDF-only,
  // so a retry must never call dokument_dodaj again.
  let details: Awaited<ReturnType<typeof readFakturaXLDocument>> = null;
  try {
    details = await readFakturaXLDocument(documentId);
  } catch (e) {
    return await fail(`FakturaXL read failed: ${(e as Error).message}`, "pdf_pending");
  }
  if (!details) {
    return await fail("FakturaXL document could not be read back", "pdf_pending");
  }

  const currency = String(invoiceRow.currency ?? "eur").toUpperCase();
  const needsRate = currency !== "PLN";
  if (needsRate && !details.exchange_rate) {
    return await fail("FakturaXL returned no NBP exchange rate yet", "pdf_pending");
  }

  const vatAmountPln =
    needsRate && details.exchange_rate
      ? Math.round(Number(invoiceRow.vat_amount ?? 0) * Number(details.exchange_rate))
      : Number(invoiceRow.vat_amount ?? 0);

  // The rate, NBP table and PLN VAT amount are still recorded for /admin/sales
  // and the accountant, even though FakturaXL now prints them on the PDF itself.
  const patch = {
    fxl_exchange_rate: needsRate ? details.exchange_rate : null,
    fxl_nbp_table: needsRate ? details.nbp_table : null,
    fxl_rate_date: needsRate ? details.rate_date : null,
    vat_amount_pln: vatAmountPln,
    payment_due_date:
      details.due_date ?? (String(invoiceRow.issued_at ?? "").slice(0, 10) || null),
  };
  await admin.from("invoices").update(patch).eq("id", invoiceId);

  let pdf: Uint8Array;
  try {
    pdf = await fetchFakturaXLPdf(documentId);
  } catch (e) {
    return await fail(`FakturaXL PDF download failed: ${(e as Error).message}`, "pdf_pending");
  }

  const path = `${invoiceFileSlug(invoiceRow.invoice_number)}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("invoices")
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) {
    return await fail(`Invoice PDF upload failed: ${uploadError.message}`, "pdf_pending");
  }
  await admin
    .from("invoices")
    .update({ pdf_path: path, fxl_status: "synced" })
    .eq("id", invoiceId);

  if (opts.email !== false) {
    await deliverInvoiceDocument(admin, { ...invoiceRow, ...patch, pdf_path: path }).catch((e) =>
      console.error("Invoice delivery failed:", e),
    );
  }

  return { pdf_path: path, pdf, fxl_status: "synced", ...patch } as any;
}



const APP_URL = "https://cert.lnrads.com";

/**
 * Development gate. Until we go live, neither the buyer notification nor the
 * FakturaXL email may reach a real inbox: both channels log what they would
 * have sent instead, and the row is marked as skipped-by-gate so the first real
 * send still happens once the flag is on.
 */
export function buyerEmailsEnabled(): boolean {
  return String(Deno.env.get("BUYER_EMAILS_ENABLED") ?? "").toLowerCase() === "true";
}

/**
 * Runs both buyer-facing delivery channels for one document, at most once each.
 * State is keyed on the invoice row, so repeated Sync passes, PDF retries and
 * row-level syncs never resend. Admin "Resend" stays an explicit override.
 */
export async function deliverInvoiceDocument(admin: any, invoice: any): Promise<void> {
  const invoiceId = invoice?.id;
  if (!invoiceId) return;

  // Read the current delivery state from the row itself — the caller may be
  // working from a stale in-memory copy.
  const { data: fresh } = await admin
    .from("invoices")
    .select(
      "id, invoice_number, doc_type, original_invoice_id, buyer_email, buyer_name, currency, " +
        "gross_amount, corrected_total_amount, line_items, fxl_document_id, " +
        "notify_status, fxl_email_status",
    )
    .eq("id", invoiceId)
    .maybeSingle();
  const row = { ...invoice, ...(fresh ?? {}) };

  const update = async (patch: Record<string, unknown>) => {
    await admin.from("invoices").update(patch).eq("id", invoiceId).catch?.(() => {});
  };

  // ---- Channel 1: our own notification (Resend, via the email queue) ----
  if (!row.notify_status) {
    if (!row.buyer_email) {
      await update({ notify_status: "no_email" });
    } else if (!buyerEmailsEnabled()) {
      console.log("[buyer-email gate off] notification NOT sent", {
        channel: "resend-notification",
        document: row.invoice_number,
        wouldSendTo: row.buyer_email,
      });
      await update({ notify_status: "skipped_gate" });
    } else {
      const ok = await sendInvoiceEmail(admin, row);
      await update(
        ok
          ? { notify_status: "queued", notify_sent_at: new Date().toISOString() }
          : { notify_status: "failed" },
      );
    }
  }

  // ---- Channel 2: FakturaXL's own email, with the PDF attached ----
  if (!row.fxl_email_status && row.fxl_document_id) {
    if (!buyerEmailsEnabled()) {
      console.log("[buyer-email gate off] FakturaXL email NOT sent", {
        channel: "fakturaxl-email",
        document: row.invoice_number,
        documentId: row.fxl_document_id,
        wouldSendTo: row.buyer_email ?? "(address held by FakturaXL)",
      });
      await update({ fxl_email_status: "skipped_gate" });
    } else {
      const outcome = await sendFakturaXLDocumentByEmail(String(row.fxl_document_id));
      await update({
        fxl_email_status: outcome.status,
        fxl_email_code: outcome.code,
        fxl_email_error: outcome.status === "sent" ? null : outcome.message,
        fxl_email_sent_at: outcome.status === "sent" ? new Date().toISOString() : null,
      });

      // A plan/configuration problem stops every buyer from getting a PDF —
      // worth an alert rather than a silent row status.
      if (outcome.status === "plan_required") {
        await admin.functions
          .invoke("send-transactional-email", {
            body: {
              templateName: "admin-delivery-alert",
              templateData: {
                affectedEmail: row.buyer_email ?? "",
                eventType: "FakturaXL email rejected (configuration)",
                reason: outcome.message,
                templateName: "fakturaxl-document-email",
                invoiceNumber: row.invoice_number ?? "",
                occurredAt: new Date().toISOString(),
              },
            },
          })
          .catch((e: unknown) => console.warn("Admin alert failed", e));
      }
    }
  }
}

/**
 * Emails the buyer a link to their invoice or correction through the project's
 * own verified sending domain (queued + retried by the email infrastructure).
 * The PDF itself stays in the private bucket and is fetched with a signed URL
 * from /payments — FakturaXL delivers the attachment separately.
 * Returns true when the send was accepted by the email pipeline.
 */
export async function sendInvoiceEmail(
  admin: any,
  invoice: any,
  opts: { resend?: boolean } = {},
): Promise<boolean> {
  const to = invoice?.buyer_email;
  if (!to) return false;

  const currency = String(invoice.currency ?? "eur").toUpperCase();
  const gross = Math.abs(Number(invoice.gross_amount ?? 0));
  const description = Array.isArray(invoice.line_items) && invoice.line_items[0]?.description
    ? String(invoice.line_items[0].description)
    : "";
  const key = `invoice-issued-${invoice.id ?? invoice.invoice_number}` +
    (opts.resend ? `-resend-${Date.now()}` : "");

  const isCorrection = String(invoice.doc_type ?? "FV").toUpperCase() === "FK";
  const money = (cents: number) => `${(Math.abs(cents) / 100).toFixed(2)} ${currency}`;

  // A correction names both documents and the total after correction, so the
  // buyer can match it against the sale it belongs to.
  let originalNumber = "";
  if (isCorrection && invoice.original_invoice_id) {
    const { data: original } = await admin
      .from("invoices")
      .select("invoice_number")
      .eq("id", invoice.original_invoice_id)
      .maybeSingle();
    originalNumber = original?.invoice_number ?? "";
  }
  const correctedTotal =
    invoice.corrected_total_amount != null ? money(Number(invoice.corrected_total_amount)) : "";

  const { error } = await admin.functions.invoke("send-transactional-email", {
    body: {
      templateName: "invoice-issued",
      recipientEmail: to,
      idempotencyKey: key,
      templateData: {
        invoiceNumber: invoice.invoice_number,
        docType: isCorrection ? "FK" : "FV",
        amount: money(gross),
        description,
        buyerName: invoice.buyer_name ?? "",
        originalInvoiceNumber: originalNumber,
        correctedTotal,
        // Plain canonical link — no query string. Filters at o2.pl/wp.pl score
        // tracking-style URLs harshly, and /payments lists every invoice anyway.
        downloadUrl: `${APP_URL}/payments`,
      },
    },
  });

  if (error) {
    console.error("Invoice email failed:", error);
    return false;
  }
  return true;
}


export function buyerFromSession(session: any): Buyer {
  const details = session.customer_details ?? {};
  const address = details.address ?? {};
  const taxIds = details.tax_ids ?? [];
  return {
    name: details.name ?? null,
    email: details.email ?? session.customer_email ?? null,
    // Business purchases: Checkout's name field holds the company name, and the
    // presence of a tax ID is what marks the sale as B2B. Older sessions may
    // still carry the company in metadata.
    company: session.metadata?.buyer_company || (taxIds.length ? (details.name ?? null) : null),
    address_line1: address.line1 ?? null,
    address_line2: address.line2 ?? null,
    postal_code: address.postal_code ?? null,
    city: address.city ?? null,
    country: address.country ?? null,
    vat_id: taxIds.length ? (taxIds[0].value ?? null) : (session.metadata?.buyer_vat_id || null),
  };
}
