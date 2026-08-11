// FakturaXL API client (XML over POST). Used for issuing invoices and sending them to KSeF.
import { XMLParser } from "npm:fast-xml-parser@4.5.0";

const FXL_BASE = "https://program.fakturaxl.pl/api";

/** Division ("oddział") id in the FakturaXL account that owns these documents. */
export const FXL_DIVISION_ID = "261055";

export const FXL_ENDPOINTS = {
  /** Create a document (invoice / correction). */
  addDocument: "dokument_dodaj",
  /** Send an existing document to KSeF. */
  sendToKsef: "dokument_ksef_wyslanie",
  /** Read a document (status, KSeF number, PDF link). */
  readDocument: "dokument_odczytaj",
} as const;

/** Documented FakturaXL response codes mapped to readable messages. */
export const FXL_ERRORS: Record<string, string> = {
  "2": "Temporary FakturaXL problem — request could not be processed, retry later",
  "3": "Invalid or inactive API token",
  "7": "No permission for this operation or document",
  "10": "Missing required field in the request",
  "15": "Invalid NIP / VAT identification number",
  "16": "Invalid date format",
  "19": "Invalid document identifier",
  "21": "Document not found",
  "41": "Invalid or unsupported currency",
  "45": "Invalid VAT rate",
  "49": "Invalid country code",
  "50": "Invalid payment method",
  "51": "Invalid division (oddział) identifier",
  "52": "Account limit exceeded (plan or document limit reached)",
  "63": "KSeF is not configured or not enabled for this account",
  "70": "Document rejected by KSeF (validation error)",
  "72": "KSeF authorisation failed (token or certificate problem)",
  "73": "KSeF is temporarily unavailable — retry later",
  "76": "Document has already been sent to KSeF",
  "900": "FakturaXL internal server error",
};

/** Only transient conditions are worth retrying. */
export function isRetryable(code: string | number | null | undefined): boolean {
  return ["2", "73", "900"].includes(String(code ?? ""));
}

/**
 * Wraps text in CDATA so ampersands and other XML-hostile characters survive.
 * A literal `]]>` inside the value is split across two CDATA sections.
 */
export function cdata(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `<![CDATA[${text.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  // Keep numeric codes as strings so "0" / "07" are not mangled.
  parseTagValue: false,
});

export type FxlResponse = Record<string, any>;

/**
 * POSTs an XML body to a FakturaXL endpoint and returns the parsed
 * `<dokument>` / `<dokumenty>` payload.
 */
export async function fxl(endpoint: string, xmlBody: string): Promise<FxlResponse> {
  const token = Deno.env.get("FAKTURAXL_API_TOKEN");
  if (!token) throw new Error("FAKTURAXL_API_TOKEN is not configured");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<dokument>
  <api_token>${cdata(token)}</api_token>
${xmlBody}
</dokument>`;

  const res = await fetch(`${FXL_BASE}/${endpoint}.php`, {
    method: "POST",
    headers: { "Content-Type": "application/xml; charset=utf-8" },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`FakturaXL ${endpoint} HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  let parsed: FxlResponse;
  try {
    parsed = parser.parse(text) ?? {};
  } catch (e) {
    throw new Error(`FakturaXL ${endpoint} returned unparsable XML: ${(e as Error).message}`);
  }

  return (parsed.dokument ?? parsed.dokumenty ?? parsed) as FxlResponse;
}

/** Human-readable message for a FakturaXL response code. */
export function fxlErrorMessage(code: string | number | null | undefined, fallback?: string): string {
  const key = String(code ?? "");
  return FXL_ERRORS[key] ?? fallback ?? `FakturaXL error ${key || "unknown"}`;
}

const decimal = (cents: number) => (Number(cents ?? 0) / 100).toFixed(2);
const day = (iso: string | null | undefined) =>
  new Date(iso ?? Date.now()).toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Stripe returns EU VAT ids as "PL1234567890"; FakturaXL expects the bare number. */
export function stripVatCountryPrefix(vatId: string | null | undefined): string {
  const raw = (vatId ?? "").replace(/[\s-]/g, "");
  return raw.replace(/^[A-Za-z]{2}(?=[0-9A-Za-z])/, "");
}

/**
 * Issues an already-persisted invoice row in FakturaXL and pushes it to KSeF.
 * Never throws: every failure is recorded on the invoice row.
 */
export async function pushInvoiceToKsef(admin: any, invoiceRow: any): Promise<void> {
  const invoiceId = invoiceRow.id;
  let attempts = Number(invoiceRow.ksef_attempts ?? 0);

  const update = async (patch: Record<string, unknown>) => {
    await admin.from("invoices").update(patch).eq("id", invoiceId);
  };
  const call = async (endpoint: string, body: string) => {
    attempts += 1;
    try {
      return await fxl(endpoint, body);
    } finally {
      await update({ ksef_attempts: attempts }).catch(() => {});
    }
  };

  try {
    const currency = String(invoiceRow.currency ?? "eur").toUpperCase();
    const isCompany = Boolean((invoiceRow.buyer_vat_id ?? "").trim());
    const issued = day(invoiceRow.issued_at);
    const gross = decimal(invoiceRow.gross_amount);
    const vatRate = String(invoiceRow.vat_rate ?? 0);
    const items: any[] = Array.isArray(invoiceRow.line_items) ? invoiceRow.line_items : [];

    const positions = items
      .map(
        (item) => `    <pozycja>
      <nazwa>${cdata(item.description ?? "")}</nazwa>
      <ilosc>${cdata(item.quantity ?? 1)}</ilosc>
      <vat>${cdata(vatRate)}</vat>
      <wartosc_brutto>${cdata(decimal(item.gross ?? 0))}</wartosc_brutto>
    </pozycja>`,
      )
      .join("\n");

    const addBody = `  <typ_faktury>0</typ_faktury>
  <id_dzialy_firmy>${cdata(FXL_DIVISION_ID)}</id_dzialy_firmy>
  <obliczaj_wartosc_faktury_od>1</obliczaj_wartosc_faktury_od>
  <numer_faktury>${cdata(invoiceRow.invoice_number)}</numer_faktury>
  <waluta>${cdata(currency)}</waluta>${
      currency !== "PLN" ? "\n  <rodzaj_przeliczania_waluty>1</rodzaj_przeliczania_waluty>" : ""
    }
  <data_wystawienia>${cdata(issued)}</data_wystawienia>
  <data_sprzedazy>${cdata(issued)}</data_sprzedazy>
  <termin_platnosci>${cdata(issued)}</termin_platnosci>
  <rodzaj_platnosci>${cdata("Karta płatnicza")}</rodzaj_platnosci>
  <kwota_oplacona>${cdata(gross)}</kwota_oplacona>
  <status>2</status>
  <wyslij_dokument_do_klienta_emailem>0</wyslij_dokument_do_klienta_emailem>
  <nabywca>
    <firma_lub_osoba_prywatna>${isCompany ? 0 : 1}</firma_lub_osoba_prywatna>
    <nazwa>${cdata(invoiceRow.buyer_company || invoiceRow.buyer_name || "")}</nazwa>
    <nip>${cdata(stripVatCountryPrefix(invoiceRow.buyer_vat_id))}</nip>
    <ulica_i_numer>${cdata(invoiceRow.buyer_address_line1 ?? "")}</ulica_i_numer>
    <kod_pocztowy>${cdata(invoiceRow.buyer_postal_code ?? "")}</kod_pocztowy>
    <miasto>${cdata(invoiceRow.buyer_city ?? "")}</miasto>
    <kraj>${cdata(invoiceRow.buyer_country ?? "")}</kraj>
    <email>${cdata(invoiceRow.buyer_email ?? "")}</email>
  </nabywca>
  <pozycje>
${positions}
  </pozycje>`;

    const added = await call(FXL_ENDPOINTS.addDocument, addBody);
    const addCode = String(added?.kod ?? "");
    if (addCode !== "1") {
      await update({
        ksef_error_code: addCode || "unknown",
        ksef_error_desc: fxlErrorMessage(addCode, added?.opis ?? added?.komunikat),
      });
      return;
    }

    const documentId = added?.dokument_id != null ? String(added.dokument_id) : null;
    const uniqueCode = added?.unikatowy_kod != null ? String(added.unikatowy_kod) : null;
    await update({
      fxl_document_id: documentId,
      fxl_unique_code: uniqueCode,
      ksef_error_code: null,
      ksef_error_desc: null,
    });

    if (!documentId) {
      await update({
        ksef_error_code: "no_document_id",
        ksef_error_desc: "FakturaXL accepted the document but returned no dokument_id",
      });
      return;
    }

    // 2. Send to KSeF. 49 / 51 / 72 all mean KSeF has the document.
    const sent = await call(
      FXL_ENDPOINTS.sendToKsef,
      `  <dokument_id>${cdata(documentId)}</dokument_id>`,
    );
    const sendCode = String(sent?.kod ?? "");
    if (!["49", "51", "72"].includes(sendCode)) {
      await update({
        ksef_status: 2,
        ksef_error_code: sendCode || "unknown",
        ksef_error_desc: fxlErrorMessage(sendCode, sent?.opis ?? sent?.komunikat),
      });
      return;
    }
    await update({ ksef_status: 0, ksef_error_code: null, ksef_error_desc: null });

    // 3. Poll briefly for the assigned KSeF number.
    for (let i = 0; i < 3; i++) {
      await sleep(1500);
      const read = await call(
        FXL_ENDPOINTS.readDocument,
        `  <dokument_id>${cdata(documentId)}</dokument_id>`,
      );
      const ksef = read?.ksef ?? read?.dokument?.ksef;
      const status = String(ksef?.status ?? "");
      const error = ksef?.blad;

      if (status === "1") {
        await update({
          ksef_status: 1,
          ksef_number: ksef?.numer_ksef != null ? String(ksef.numer_ksef) : null,
          ksef_assigned_at: ksef?.data_nadania_numeru
            ? new Date(String(ksef.data_nadania_numeru).replace(" ", "T")).toISOString()
            : new Date().toISOString(),
          ksef_error_code: null,
          ksef_error_desc: null,
        });
        return;
      }

      if (status === "2") {
        const code = error?.kod != null ? String(error.kod) : null;
        await update({
          ksef_status: 2,
          ksef_error_code: code,
          ksef_error_desc: error?.opis
            ? String(error.opis)
            : fxlErrorMessage(code, "KSeF rejected the document"),
        });
        return;
      }
    }
    // Still pending — the reconciler picks it up (ksef_status stays 0).
  } catch (error) {
    await admin
      .from("invoices")
      .update({
        ksef_attempts: attempts,
        ksef_error_code: "exception",
        ksef_error_desc: (error as Error).message?.slice(0, 500) ?? "Unknown error",
      })
      .eq("id", invoiceId)
      .then(() => {}, () => {});
  }
}

