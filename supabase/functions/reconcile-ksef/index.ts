// Reconciles invoices whose KSeF submission is still pending, and retries
// invoices that never made it into FakturaXL with a transient error.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  FXL_ENDPOINTS,
  cdata,
  fxl,
  fxlErrorMessage,
  isRetryable,
  pushInvoiceToKsef,
  requiresKsef,
} from "../_shared/fakturaxl.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// dokument_odczytaj.php allows one request per second.
const CALL_INTERVAL_MS = 1100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const isCron = req.headers.get("Lovable-Context") === "cron";
  if (!isCron && auth !== `Bearer ${serviceKey}`) {
    return json({ error: "Forbidden" }, 403);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey, {
    auth: { persistSession: false },
  });

  const result = { checked: 0, assigned: 0, failed: 0, pending: 0, retried: 0, errors: [] as string[] };

  try {
    // 1. Documents already in KSeF that have no number yet.
    const { data: pending, error: pendingError } = await admin
      .from("invoices")
      .select("id, fxl_document_id, ksef_attempts")
      .eq("ksef_status", 0)
      .not("fxl_document_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(50);
    if (pendingError) throw pendingError;

    for (const row of pending ?? []) {
      result.checked += 1;
      const attempts = Number(row.ksef_attempts ?? 0) + 1;
      try {
        const read = await fxl(
          FXL_ENDPOINTS.readDocument,
          `  <dokument_id>${cdata(row.fxl_document_id)}</dokument_id>`,
        );
        const ksef = read?.ksef ?? read?.dokument?.ksef;
        const status = String(ksef?.status ?? "");
        const error = ksef?.blad;

        if (status === "1") {
          await admin
            .from("invoices")
            .update({
              ksef_status: 1,
              ksef_attempts: attempts,
              ksef_number: ksef?.numer_ksef != null ? String(ksef.numer_ksef) : null,
              ksef_assigned_at: ksef?.data_nadania_numeru
                ? new Date(String(ksef.data_nadania_numeru).replace(" ", "T")).toISOString()
                : new Date().toISOString(),
              ksef_error_code: null,
              ksef_error_desc: null,
            })
            .eq("id", row.id);
          result.assigned += 1;
        } else if (status === "2") {
          const code = error?.kod != null ? String(error.kod) : null;
          await admin
            .from("invoices")
            .update({
              ksef_status: 2,
              ksef_attempts: attempts,
              ksef_error_code: code,
              ksef_error_desc: error?.opis
                ? String(error.opis)
                : fxlErrorMessage(code, "KSeF rejected the document"),
            })
            .eq("id", row.id);
          result.failed += 1;
        } else {
          await admin.from("invoices").update({ ksef_attempts: attempts }).eq("id", row.id);
          result.pending += 1;
        }
      } catch (e) {
        result.errors.push(`${row.id}: ${(e as Error).message?.slice(0, 200)}`);
        await admin
          .from("invoices")
          .update({
            ksef_attempts: attempts,
            ksef_error_code: "exception",
            ksef_error_desc: (e as Error).message?.slice(0, 500) ?? "Unknown error",
          })
          .eq("id", row.id);
      }
      await sleep(CALL_INTERVAL_MS);
    }

    // 2. Invoices that never reached FakturaXL, with a retryable error.
    const { data: unsent, error: unsentError } = await admin
      .from("invoices")
      .select("*")
      .is("fxl_document_id", null)
      .lt("ksef_attempts", 5)
      .not("ksef_error_code", "is", null)
      .order("created_at", { ascending: true })
      .limit(50);
    if (unsentError) throw unsentError;

    for (const row of unsent ?? []) {
      if (!requiresKsef(row)) continue;
      if (!isRetryable(row.ksef_error_code)) continue;
      await pushInvoiceToKsef(admin, row);
      result.retried += 1;
      await sleep(CALL_INTERVAL_MS);
    }

    return json(result);
  } catch (e) {
    return json({ error: (e as Error).message, ...result }, 500);
  }
});
