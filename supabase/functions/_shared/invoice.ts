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
 * back, store the NBP rate, then render, upload and email the PDF.
 *
 * Never renders or emails a PDF without the rate note — a late invoice is
 * acceptable, a non-compliant one is not. On failure the row stays
 * `fxl_status = 'pending'` so /admin/sales shows it and the reconciler retries.
 */
export async function finalizeInvoice(
  admin: any,
  invoiceRow: any,
  opts: { originalInvoiceNumber?: string | null; email?: boolean } = {},
): Promise<{ pdf_path?: string; pdf?: Uint8Array; fxl_status: string; error?: string }> {
  const invoiceId = invoiceRow.id;
  const fail = async (error: string) => {
    console.error(`Invoice ${invoiceRow.invoice_number} pending:`, error);
    await admin.from("invoices").update({ fxl_status: "pending" }).eq("id", invoiceId);
    return { fxl_status: "pending", error };
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

  let details: Awaited<ReturnType<typeof readFakturaXLDocument>> = null;
  try {
    details = await readFakturaXLDocument(documentId);
  } catch (e) {
    return await fail(`FakturaXL read failed: ${(e as Error).message}`);
  }
  if (!details) return await fail("FakturaXL document could not be read back");

  const currency = String(invoiceRow.currency ?? "eur").toUpperCase();
  const needsRate = currency !== "PLN";
  if (needsRate && !details.exchange_rate) {
    return await fail("FakturaXL returned no NBP exchange rate yet");
  }

  const vatAmountPln =
    needsRate && details.exchange_rate
      ? Math.round(Number(invoiceRow.vat_amount ?? 0) * Number(details.exchange_rate))
      : Number(invoiceRow.vat_amount ?? 0);

  const patch = {
    fxl_status: "synced",
    fxl_exchange_rate: needsRate ? details.exchange_rate : null,
    fxl_nbp_table: needsRate ? details.nbp_table : null,
    fxl_rate_date: needsRate ? details.rate_date : null,
    vat_amount_pln: vatAmountPln,
    payment_due_date:
      details.due_date ?? (String(invoiceRow.issued_at ?? "").slice(0, 10) || null),
  };
  await admin.from("invoices").update(patch).eq("id", invoiceId);

  const pdf = await renderInvoicePdf({
    ...(invoiceRow as any),
    ...patch,
    original_invoice_number: opts.originalInvoiceNumber ?? null,
  });

  const path = `${invoiceFileSlug(invoiceRow.invoice_number)}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("invoices")
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) console.error("Invoice upload failed:", uploadError);
  else await admin.from("invoices").update({ pdf_path: path }).eq("id", invoiceId);

  if (opts.email !== false && invoiceRow.buyer_email) {
    await sendInvoiceEmail(admin, { ...invoiceRow, ...patch }).catch((e) =>
      console.error("Invoice email failed:", e),
    );
  }

  return { pdf_path: path, pdf, fxl_status: "synced", ...patch } as any;
}


const APP_URL = "https://cert.lnrads.com";

/**
 * Emails the buyer a link to their invoice through the project's own verified
 * sending domain (queued + retried by the email infrastructure). The PDF itself
 * stays in the private bucket and is fetched with a signed URL from /payments.
 */
export async function sendInvoiceEmail(admin: any, invoice: any, opts: { resend?: boolean } = {}) {
  const to = invoice?.buyer_email;
  if (!to) return;

  const currency = String(invoice.currency ?? "eur").toUpperCase();
  const gross = Math.abs(Number(invoice.gross_amount ?? 0));
  const description = Array.isArray(invoice.line_items) && invoice.line_items[0]?.description
    ? String(invoice.line_items[0].description)
    : "";
  const key = `invoice-issued-${invoice.id ?? invoice.invoice_number}` +
    (opts.resend ? `-resend-${Date.now()}` : "");

  const { error } = await admin.functions.invoke("send-transactional-email", {
    body: {
      templateName: "invoice-issued",
      recipientEmail: to,
      idempotencyKey: key,
      templateData: {
        invoiceNumber: invoice.invoice_number,
        docType: invoice.doc_type ?? "FV",
        amount: `${(gross / 100).toFixed(2)} ${currency}`,
        description,
        buyerName: invoice.buyer_name ?? "",
        // Plain canonical link — no query string. Filters at o2.pl/wp.pl score
        // tracking-style URLs harshly, and /payments lists every invoice anyway.
        downloadUrl: `${APP_URL}/payments`,
      },
    },
  });

  if (error) console.error("Invoice email failed:", error);
}

export function buyerFromSession(session: any): Buyer {
  const details = session.customer_details ?? {};
  const address = details.address ?? {};
  const taxIds = details.tax_ids ?? [];
  return {
    name: details.name ?? null,
    email: details.email ?? session.customer_email ?? null,
    company: session.metadata?.buyer_company ?? null,
    address_line1: address.line1 ?? null,
    address_line2: address.line2 ?? null,
    postal_code: address.postal_code ?? null,
    city: address.city ?? null,
    country: address.country ?? null,
    vat_id: taxIds.length ? (taxIds[0].value ?? null) : (session.metadata?.buyer_vat_id || null),
  };
}
