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
