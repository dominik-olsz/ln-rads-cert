// Reconciles invoices whose KSeF submission is still pending, and retries
// invoices that never made it into FakturaXL with a transient error.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  FXL_ENDPOINTS,
  fxl,
  fxlErrorMessage,
  isRetryable,
  pushInvoiceToFakturaXL,
} from "../_shared/fakturaxl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// dokument_odczytaj.php allows one request per second.
const CALL_INTERVAL_MS = 1100;

/** Length-independent, constant-time string comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ba.length ^ bb.length;
  const len = Math.max(ba.length, bb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!cronSecret || !timingSafeEqual(auth, `Bearer ${cronSecret}`)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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
      .limit(20);
    if (pendingError) throw pendingError;

    for (const row of pending ?? []) {
      result.checked += 1;
      const attempts = Number(row.ksef_attempts ?? 0) + 1;
      try {
        const read = await fxl(
          FXL_ENDPOINTS.readDocument,
          `  <dokument_id>${row.fxl_document_id}</dokument_id>`,
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

    // 2. Invoices that never reached FakturaXL, with a retryable error or no
    //    error recorded at all (e.g. the push crashed before writing one).
    const { data: unsent, error: unsentError } = await admin
      .from("invoices")
      .select("*")
      .is("fxl_document_id", null)
      .lt("ksef_attempts", 5)
      .order("created_at", { ascending: true })
      .limit(20);
    if (unsentError) throw unsentError;

    for (const row of unsent ?? []) {
      if (row.ksef_error_code != null && !isRetryable(row.ksef_error_code)) continue;

      await pushInvoiceToFakturaXL(admin, row);
      result.retried += 1;
      await sleep(CALL_INTERVAL_MS);
    }

    return json(result);
  } catch (e) {
    return json({ error: (e as Error).message, ...result }, 500);
  }
});
