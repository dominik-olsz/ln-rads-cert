// FakturaXL API client (XML over POST). Used for issuing invoices and sending them to KSeF.
import { XMLParser } from "npm:fast-xml-parser@4.5.0";

const FXL_BASE = "https://program.fakturaxl.pl/api";

/** Division ("oddział") id in the FakturaXL account that owns these documents. */
export const FXL_DIVISION_ID = "261055";

/**
 * Document language sent as `jezyk` on every document.
 * 2 = Polski/Angielski (Polish first), 3 = Angielski/Polski.
 */
export const FXL_LANGUAGE = 2;

export const FXL_ENDPOINTS = {
  /** Create a document (invoice / correction). */
  addDocument: "dokument_dodaj",
  /** Send an existing document to KSeF. */
  sendToKsef: "dokument_ksef_wyslanie",
  /** Read a document (status, KSeF number, PDF link). */
  readDocument: "dokument_odczytaj",
  /** List documents (supports date filters + pagination, 1 request / 5 s). */
  listDocuments: "lista_dokumentow",
  /** Authenticated PDF download — returns base64 in <pdf>, 1 request / s. */
  documentPdf: "pdf_p",
} as const;




/** Documented FakturaXL response codes mapped to readable messages. */
export const FXL_ERRORS: Record<string, string> = {
  "2": "Rate limit exceeded — retry later",
  "3": "api_token does not exist",
  "7": "A document with this number already exists",
  "10": "Invalid NIP",
  "15": "Invalid currency",
  "16": "No NBP exchange rate for this date",
  "19": "Free-plan invoice limit reached",
  "21": "Accounting month is closed",
  "41": "Correction currency must match the original",
  "45": "Cannot delete — already sent to KSeF",
  "49": "Correctly sent to KSeF",
  "50": "Error while sending to KSeF",
  "51": "Already sent to KSeF",
  "52": "No KSeF connection configured in FakturaXL settings",
  "63": "API email requires the paid plan",
  "70": "API key blocked",
  "71": "Document must contain at least one product",
  "72": "Already sent, awaiting KSeF number",
  "73": "Service temporarily unavailable",
  "76": "Not sent to KSeF because the buyer NIP is missing",
  "77": "Invalid KSeF number",
  "900": "Maintenance in progress",
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

/** Parses a FakturaXL XML response into a plain object. */
export function xmlToObject(text: string): FxlResponse {
  try {
    return (parser.parse(text) ?? {}) as FxlResponse;
  } catch (e) {
    throw new Error(`FakturaXL returned unparsable XML: ${(e as Error).message}`);
  }
}

/**
 * POSTs an XML body to a FakturaXL endpoint and returns the parsed
 * `<dokument>` / `<dokumenty>` payload.
 */
export async function fxlRaw(endpoint: string, xmlBody: string, root = "dokument"): Promise<string> {
  const token = Deno.env.get("FAKTURAXL_API_TOKEN");
  if (!token) throw new Error("FAKTURAXL_API_TOKEN is not configured");

  // The token is alphanumeric and needs no escaping; some endpoints parse the
  // XML naively and reject a CDATA-wrapped token with kod=3.
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<${root}>
  <api_token>${token}</api_token>
${xmlBody}
</${root}>`;

  const res = await fetch(`${FXL_BASE}/${endpoint}.php`, {
    method: "POST",
    headers: { "Content-Type": "application/xml; charset=utf-8" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`FakturaXL ${endpoint} HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  return text;
}

export async function fxl(endpoint: string, xmlBody: string, root = "dokument"): Promise<FxlResponse> {
  const text = await fxlRaw(endpoint, xmlBody, root);



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
 * KSeF is mandatory only for domestic Polish B2B invoices.
 * Consumers (no VAT ID) and foreign buyers — including EU reverse-charge —
 * are skipped, leaving ksef_status null so they are distinguishable from failures.
 */
export function requiresKsef(invoiceRow: {
  buyer_country?: string | null;
  buyer_vat_id?: string | null;
}): boolean {
  const country = String(invoiceRow.buyer_country ?? "").trim().toUpperCase();
  const vatId = String(invoiceRow.buyer_vat_id ?? "").trim();
  return country === "PL" && vatId.length > 0;
}

/** Splits a full name on the last space: "Anna Maria Kowalska" -> imie/nazwisko. */
export function splitBuyerName(full: string | null | undefined): { imie: string; nazwisko: string } | null {
  const name = String(full ?? "").trim().replace(/\s+/g, " ");
  const idx = name.lastIndexOf(" ");
  if (idx <= 0 || idx === name.length - 1) return null;
  return { imie: name.slice(0, idx), nazwisko: name.slice(idx + 1) };
}

/**
 * Creates an already-persisted invoice row as a document in FakturaXL, and — only
 * for domestic Polish B2B invoices — submits it to KSeF and polls for its number.
 * Never throws: every failure is recorded on the invoice row.
 */
export async function pushInvoiceToFakturaXL(admin: any, invoiceRow: any): Promise<void> {

  const invoiceId = invoiceRow.id;
  // One attempt per push, not per HTTP call: a single push makes up to five
  // API calls and the reconciler filters on ksef_attempts < 5.
  const attemptsBefore = Number(invoiceRow.ksef_attempts ?? 0);
  let attempts = attemptsBefore + 1;

  const update = async (patch: Record<string, unknown>) => {
    await admin.from("invoices").update(patch).eq("id", invoiceId);
  };
  const call = async (endpoint: string, body: string) => await fxl(endpoint, body);

  await update({ ksef_attempts: attempts }).catch(() => {});



  try {
    const isCorrection = String(invoiceRow.doc_type ?? "").toUpperCase() === "FK";

    // Corrections need the FakturaXL id of the document they correct.
    let original: any = null;
    if (isCorrection) {
      if (!invoiceRow.original_invoice_id) {
        await update({
          ksef_error_code: "no_original_invoice",
          ksef_error_desc: "Correction has no original_invoice_id — nothing to correct in KSeF",
        });
        return;
      }
      const { data } = await admin
        .from("invoices")
        .select("id, fxl_document_id, currency, gross_amount, line_items")
        .eq("id", invoiceRow.original_invoice_id)
        .maybeSingle();
      original = data;
      if (!original?.fxl_document_id) {
        await update({
          ksef_error_code: "original_not_in_ksef",
          ksef_error_desc:
            "Original invoice was never pushed to FakturaXL/KSeF (e.g. consumer invoice) — no correction sent",
        });
        return;
      }
    }

    // FakturaXL rejects a correction whose currency differs from the original (kod=41).
    const currency = String(
      (isCorrection ? original?.currency : null) ?? invoiceRow.currency ?? "eur",
    ).toUpperCase();
    const isCompany = Boolean((invoiceRow.buyer_vat_id ?? "").trim());
    const issued = day(invoiceRow.issued_at);
    const gross = decimal(invoiceRow.gross_amount);
    const vatRate = String(invoiceRow.vat_rate ?? 0);
    const items: any[] = Array.isArray(invoiceRow.line_items) ? invoiceRow.line_items : [];

    // Line items are repeated document-level <faktura_pozycje> elements —
    // there is no <pozycje> wrapper and no <pozycja> element.
    // Numeric fields are sent bare; only free text keeps CDATA.
    const renderPositions = (list: any[], tag = "faktura_pozycje", indent = "  ") =>
      list
        .map(
          (item) => `${indent}<${tag}>
${indent}  <nazwa>${cdata(item.description ?? "")}</nazwa>
${indent}  <ilosc>${Number(item.quantity ?? 1)}</ilosc>
${indent}  <vat>${vatRate}</vat>
${indent}  <wartosc_brutto>${decimal(item.gross ?? 0)}</wartosc_brutto>
${indent}</${tag}>`,
        )
        .join("\n");


    const positions = renderPositions(items);

    let correctionSection = "";
    if (isCorrection) {
      const originalGross = Math.abs(Number(original?.gross_amount ?? 0));
      const creditedGross = Math.abs(Number(invoiceRow.gross_amount ?? 0));
      const isPartial = creditedGross > 0 && creditedGross < originalGross;

      let amountsBlock = "";
      if (isPartial) {
        // Partial refund: FakturaXL needs the before/after values explicitly.
        // "powinno_byc" carries what remains, not what was credited.
        const originalItems: any[] = Array.isArray(original?.line_items) ? original.line_items : [];
        const remaining = originalGross - creditedGross;
        const shouldBe = originalItems.length
          ? [{ ...originalItems[0], gross: remaining }]
          : [{ description: items[0]?.description ?? "Correction", quantity: 1, gross: remaining }];
        // Document-level elements, not children of <korekta>.
        amountsBlock = `
${renderPositions(originalItems.length ? originalItems : shouldBe, "faktura_pozycje_bylo")}
${renderPositions(shouldBe, "faktura_pozycje_powinno_byc")}`;
      }
      // Full credit: positions are pulled from the corrected document by FakturaXL.

      correctionSection = `
  <korekta>
    <id_faktury_korygowanej>${original.fxl_document_id}</id_faktury_korygowanej>
    <przyczyna_korekty>${cdata(invoiceRow.refund_reason ?? "Zwrot płatności")}</przyczyna_korekty>
  </korekta>${amountsBlock}`;
    }

    // Private persons need imie + nazwisko (kod 38 / 39 when empty); companies use nazwa.
    let buyerIdentity: string;
    if (isCompany) {
      buyerIdentity = `    <nazwa>${cdata(
        invoiceRow.buyer_company || invoiceRow.buyer_name || "",
      )}</nazwa>
    <nip>${stripVatCountryPrefix(invoiceRow.buyer_vat_id)}</nip>`;
    } else {
      const parts = splitBuyerName(invoiceRow.buyer_name);
      if (!parts) {
        await update({
          ksef_error_code: "buyer_name_required",
          ksef_error_desc:
            "Buyer's full name (first name and surname) is required to issue this invoice in FakturaXL",
        });
        return;
      }
      buyerIdentity = `    <imie>${cdata(parts.imie)}</imie>
    <nazwisko>${cdata(parts.nazwisko)}</nazwisko>`;
    }

    // Omit address elements entirely when we don't have them.
    const optional = (tag: string, value: unknown, raw = false) => {
      const text = String(value ?? "").trim();
      if (!text) return "";
      return `\n    <${tag}>${raw ? text : cdata(text)}</${tag}>`;
    };

    const addBody = `  <typ_faktury>${isCorrection ? 4 : 0}</typ_faktury>
  <id_dzialy_firmy>${FXL_DIVISION_ID}</id_dzialy_firmy>
  <obliczaj_wartosc_faktury_od>1</obliczaj_wartosc_faktury_od>
  <numer_faktury>${cdata(invoiceRow.invoice_number)}</numer_faktury>
  <waluta>${currency}</waluta>${
      currency !== "PLN" ? "\n  <rodzaj_przeliczania_waluty>1</rodzaj_przeliczania_waluty>" : ""
    }
  <data_wystawienia>${issued}</data_wystawienia>
  <data_sprzedazy>${issued}</data_sprzedazy>
  <termin_platnosci_data>${issued}</termin_platnosci_data>
  <rodzaj_platnosci>${cdata("Karta płatnicza")}</rodzaj_platnosci>
  <kwota_oplacona>${gross}</kwota_oplacona>
  <status>2</status>
  <data_oplacenia>${issued}</data_oplacenia>
  <wyslij_dokument_do_klienta_emailem>0</wyslij_dokument_do_klienta_emailem>${correctionSection}
  <nabywca>
    <firma_lub_osoba_prywatna>${isCompany ? 0 : 1}</firma_lub_osoba_prywatna>
${buyerIdentity}${optional("ulica_i_numer", invoiceRow.buyer_address_line1)}${
      optional("kod_pocztowy", invoiceRow.buyer_postal_code, true)
    }${optional("miejscowosc", invoiceRow.buyer_city)}${
      optional("kraj", (invoiceRow.buyer_country ?? "").toUpperCase(), true)
    }${optional("email", invoiceRow.buyer_email, true)}
  </nabywca>${
      // Corrections: FakturaXL pulls positions from the corrected document
      // (or from the before/after blocks above for partial credits).
      isCorrection ? "" : `\n${positions}`
    }`;




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

    // 2. KSeF is only for domestic Polish B2B. Everyone else stops here with a
    //    FakturaXL document and ksef_status null (not applicable, not an error).
    if (!requiresKsef(invoiceRow)) return;

    // 49 / 51 / 72 all mean KSeF has the document.
    const sent = await call(
      FXL_ENDPOINTS.sendToKsef,
      `  <dokument_id>${documentId}</dokument_id>`,
    );

    const sendCode = String(sent?.kod ?? "");
    if (sendCode === "52") {
      // The KSeF connection isn't authenticated yet. Expected state, not a
      // failure: keep ksef_status null and don't burn a retry attempt.
      attempts = attemptsBefore;
      await update({
        ksef_status: null,
        ksef_attempts: attempts,
        ksef_error_code: null,
        ksef_error_desc: "KSeF connection not configured",
      });
      return;
    }
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
        `  <dokument_id>${documentId}</dokument_id>`,
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


export type FxlDocumentDetails = {
  invoice_number: string | null;
  gross: number | null;
  exchange_rate: number | null;
  nbp_table: string | null;
  rate_date: string | null;
  due_date: string | null;
  currency: string | null;
};

const firstValue = (obj: any, keys: string[]): string | null => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return null;
};

/**
 * Reads a created FakturaXL document back so our PDF can copy the values the
 * provider resolved — most importantly the NBP exchange rate used for VAT in PLN.
 */
export async function readFakturaXLDocument(
  documentId: string,
): Promise<FxlDocumentDetails | null> {
  const read = await fxl(FXL_ENDPOINTS.readDocument, `  <dokument_id>${documentId}</dokument_id>`);
  const doc = (read?.dokument ?? read) as any;
  if (!doc || typeof doc !== "object") return null;
  const number = firstValue(doc, ["numer_faktury", "numer"]);
  if (!number) return null;

  const num = (raw: string | null) => {
    if (!raw) return null;
    const parsed = Number(raw.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const date = (raw: string | null) => (raw ? raw.slice(0, 10) : null);

  return {
    invoice_number: number,
    gross: num(firstValue(doc, ["wartosc_brutto", "brutto", "kwota_brutto"])),
    exchange_rate: num(firstValue(doc, ["kurs", "kurs_waluty"])),
    nbp_table: firstValue(doc, ["nr_tabeli_nbp", "numer_tabeli_nbp", "tabela_nbp"]),
    rate_date: date(firstValue(doc, ["data_kursu", "kurs_data"])),
    due_date: date(firstValue(doc, ["termin_platnosci_data", "termin_platnosci"])),
    currency: firstValue(doc, ["waluta"]),
  };
}
