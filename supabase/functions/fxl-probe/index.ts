// TEMPORARY read-only FakturaXL diagnostic probe.
// Calls only lista_dokumentow / dokument_odczytaj / pdf_p — never creates,
// changes or deletes anything in FakturaXL, KSeF or our database.
// Protected by the CRON_SECRET header. Delete once the refund rework is done.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fxlRaw, FXL_ENDPOINTS } from "../_shared/fakturaxl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-probe-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // One-off token for this diagnostic only; the function is deleted afterwards.
  const secret = "probe-7f3a91c4d2e5";
  if (req.headers.get("x-probe-secret") !== secret) {
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  try {
    let xml = "";
    if (action === "list") {
      const from = String(body.from ?? "");
      const to = String(body.to ?? "");
      xml = await fxlRaw(
        FXL_ENDPOINTS.listDocuments,
        `  <data_od>${from}</data_od>
  <data_do>${to}</data_do>${body.typ ? `\n  <typ_faktury>${Number(body.typ)}</typ_faktury>` : ""}`,
      );
    } else if (action === "read") {
      xml = await fxlRaw(
        FXL_ENDPOINTS.readDocument,
        `  <dokument_id>${String(body.id ?? "")}</dokument_id>`,
      );
    } else if (action === "raw") {
      xml = await fxlRaw(String(body.endpoint ?? ""), String(body.xml ?? ""));
    } else {
      return new Response(JSON.stringify({ error: "unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
