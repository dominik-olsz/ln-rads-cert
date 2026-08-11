// Shared invoicing helpers: VAT logic, PDF rendering, storage upload, email.
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1?target=deno";
import { pushInvoiceToKsef, requiresKsef } from "./fakturaxl.ts";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1?target=deno";

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

const money = (cents: number, currency = "eur") =>
  `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;

/** Filesystem-safe slug for invoice numbers like "FV EDU/15/08/2026" -> "FV-EDU-15-08-2026". */
export const invoiceFileSlug = (invoiceNumber: string) =>
  invoiceNumber.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");

let fontCache: { regular: Uint8Array; bold: Uint8Array } | null = null;
async function loadFonts() {
  if (fontCache) return fontCache;
  const base = "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf";
  const [regular, bold] = await Promise.all([
    fetch(`${base}/DejaVuSans.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${base}/DejaVuSans-Bold.ttf`).then((r) => r.arrayBuffer()),
  ]);
  fontCache = { regular: new Uint8Array(regular), bold: new Uint8Array(bold) };
  return fontCache;
}

export type InvoiceRecord = {
  invoice_number: string;
  doc_type: string;
  issued_at: string;
  currency: string;
  vat_rate: number;
  reverse_charge: boolean;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  line_items: { description: string; quantity: number; gross: number }[];
  seller: Seller;
  buyer_name?: string | null;
  buyer_company?: string | null;
  buyer_email?: string | null;
  buyer_address_line1?: string | null;
  buyer_address_line2?: string | null;
  buyer_postal_code?: string | null;
  buyer_city?: string | null;
  buyer_country?: string | null;
  buyer_vat_id?: string | null;
  original_invoice_number?: string | null;
  refund_reason?: string | null;
  notes?: string | null;
};

export async function renderInvoicePdf(inv: InvoiceRecord): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fonts = await loadFonts();
  const regular = await doc.embedFont(fonts.regular);
  const bold = await doc.embedFont(fonts.bold);

  const page = doc.addPage([595.28, 841.89]);
  const { width } = page.getSize();
  const dark = rgb(0, 0.32, 0.31);
  const grey = rgb(0.35, 0.35, 0.35);
  const margin = 48;
  let y = 792;

  const text = (
    s: string,
    x: number,
    size = 10,
    opts: { bold?: boolean; color?: ReturnType<typeof rgb>; yy?: number } = {},
  ) => {
    page.drawText(s, {
      x,
      y: opts.yy ?? y,
      size,
      font: opts.bold ? bold : regular,
      color: opts.color ?? rgb(0.1, 0.1, 0.1),
    });
  };
  const right = (s: string, size = 10, isBold = false, yy?: number) => {
    const font = isBold ? bold : regular;
    const w = font.widthOfTextAtSize(s, size);
    page.drawText(s, { x: width - margin - w, y: yy ?? y, size, font, color: rgb(0.1, 0.1, 0.1) });
  };

  const isCorrection = inv.doc_type === "FK";
  text(isCorrection ? "FAKTURA KORYGUJĄCA" : "FAKTURA", margin, 20, { bold: true, color: dark });
  right(inv.invoice_number, 14, true);
  y -= 18;
  text(isCorrection ? "Correction invoice" : "Invoice", margin, 10, { color: grey });
  right(
    `Data wystawienia / Issue date: ${new Date(inv.issued_at).toISOString().slice(0, 10)}`,
    9,
  );
  y -= 12;
  if (isCorrection && inv.original_invoice_number) {
    text(`do faktury / to invoice: ${inv.original_invoice_number}`, margin, 9, { color: grey });
  }

  y -= 26;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: dark,
  });

  // Parties
  y -= 22;
  const colRight = 320;
  text("Sprzedawca / Seller", margin, 9, { bold: true, color: dark });
  text("Nabywca / Buyer", colRight, 9, { bold: true, color: dark });
  y -= 15;

  const sellerLines = [
    inv.seller.name,
    inv.seller.address_line1,
    inv.seller.address_line2,
    `NIP: ${inv.seller.nip}`,
    inv.seller.regon ? `REGON: ${inv.seller.regon}` : "",
    inv.seller.email ?? "",
  ].filter(Boolean);

  const buyerLines = [
    inv.buyer_company || inv.buyer_name || "—",
    inv.buyer_company && inv.buyer_name ? inv.buyer_name : "",
    inv.buyer_address_line1 ?? "",
    [inv.buyer_postal_code, inv.buyer_city].filter(Boolean).join(" "),
    inv.buyer_country ?? "",
    inv.buyer_vat_id ? `VAT ID / NIP: ${inv.buyer_vat_id}` : "",
    inv.buyer_email ?? "",
  ].filter(Boolean);

  const rows = Math.max(sellerLines.length, buyerLines.length);
  const startY = y;
  for (let i = 0; i < rows; i++) {
    const lineY = startY - i * 13;
    if (sellerLines[i]) text(sellerLines[i], margin, 9.5, { yy: lineY });
    if (buyerLines[i]) text(buyerLines[i], colRight, 9.5, { yy: lineY });
  }
  y = startY - rows * 13 - 22;

  // Items table
  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: width - margin * 2,
    height: 20,
    color: rgb(0.94, 0.96, 0.96),
  });
  const headY = y + 2;
  text("Nazwa / Description", margin + 6, 9, { bold: true, yy: headY });
  text("Ilość", 300, 9, { bold: true, yy: headY });
  text("Netto", 350, 9, { bold: true, yy: headY });
  text("VAT", 430, 9, { bold: true, yy: headY });
  right("Brutto", 9, true, headY);
  y -= 28;

  const rate = inv.vat_rate;
  for (const item of inv.line_items) {
    const gross = item.gross;
    const net = rate ? Math.round(gross / (1 + rate / 100)) : gross;
    text(item.description.slice(0, 46), margin + 6, 9.5);
    text(String(item.quantity), 300, 9.5);
    text(money(net, inv.currency), 350, 9.5);
    text(rate ? `${rate}%` : "0%", 430, 9.5);
    right(money(gross, inv.currency), 9.5);
    y -= 16;
  }

  y -= 10;
  page.drawLine({
    start: { x: 320, y },
    end: { x: width - margin, y },
    thickness: 0.7,
    color: grey,
  });
  y -= 18;
  text("Netto / Net", 330, 10);
  right(money(inv.net_amount, inv.currency), 10);
  y -= 15;
  text(`VAT ${rate}%`, 330, 10);
  right(money(inv.vat_amount, inv.currency), 10);
  y -= 18;
  text("Do zapłaty / Total", 330, 12, { bold: true, color: dark });
  right(money(inv.gross_amount, inv.currency), 12, true);

  y -= 34;
  if (inv.reverse_charge) {
    text(
      "Odwrotne obciążenie — VAT rozlicza nabywca (art. 28b ustawy o VAT).",
      margin,
      9,
      { color: grey },
    );
    y -= 12;
    text(
      "Reverse charge — VAT to be accounted for by the recipient.",
      margin,
      9,
      { color: grey },
    );
    y -= 16;
  }
  if (isCorrection) {
    text(
      `Przyczyna korekty / Reason: ${inv.refund_reason ?? "zwrot płatności / refund"}`,
      margin,
      9,
      { color: grey },
    );
    y -= 14;
  }
  text("Zapłacono kartą / Paid by card (Stripe).", margin, 9, { color: grey });
  y -= 14;
  if (inv.notes) text(inv.notes, margin, 9, { color: grey });

  page.drawText("Dokument wygenerowany automatycznie / Generated automatically", {
    x: margin,
    y: 40,
    size: 8,
    font: regular,
    color: grey,
  });

  return await doc.save();
}

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
  const amounts = computeAmounts(params.grossCents, params.buyer, standardRate);

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
    issued_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await admin
    .from("invoices")
    .insert(row)
    .select()
    .single();
  if (insertError) throw new Error(`Invoice insert failed: ${insertError.message}`);

  const pdf = await renderInvoicePdf({
    ...(inserted as any),
    seller,
    line_items: params.lineItems,
    original_invoice_number: params.originalInvoiceNumber ?? null,
  });

  const path = `${invoiceFileSlug(invoiceNumber)}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("invoices")
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) console.error("Invoice upload failed:", uploadError);
  else await admin.from("invoices").update({ pdf_path: path }).eq("id", inserted.id);

  if (params.email !== false && params.buyer.email) {
    await sendInvoiceEmail(params.buyer.email, invoiceNumber, pdf, docType).catch((e) =>
      console.error("Invoice email failed:", e),
    );
  }

  // KSeF submission is best-effort: the invoice is already created, stored and emailed.
  // Failures are recorded on the row so they can be retried or handled manually.
  if (requiresKsef(inserted)) {
    await pushInvoiceToKsef(admin, inserted).catch((e) =>
      console.error("KSeF push failed (non-blocking):", e),
    );
  }

  return { ...inserted, pdf_path: path, pdf };
}

export async function sendInvoiceEmail(
  to: string,
  invoiceNumber: string,
  pdf: Uint8Array,
  docType = "FV",
) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("RESEND_API_KEY missing, skipping invoice email");
    return;
  }
  const base64 = btoa(String.fromCharCode(...pdf));
  const isCorrection = docType === "FK";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "LN-RADS Certification <cert@lnrads.com>",
      to: [to],
      subject: `${isCorrection ? "Correction invoice" : "Invoice"} ${invoiceNumber}`,
      html: `<p>Hello,</p><p>Please find attached ${
        isCorrection ? "a correction invoice" : "your invoice"
      } <strong>${invoiceNumber}</strong>.</p><p>Praktyka Lekarska Cezary Chudobiński</p>`,
      attachments: [{ filename: `${invoiceFileSlug(invoiceNumber)}.pdf`, content: base64 }],
    }),
  });
  if (!res.ok) console.error("Resend error:", res.status, await res.text());
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
    vat_id: taxIds.length ? (taxIds[0].value ?? null) : null,
  };
}
