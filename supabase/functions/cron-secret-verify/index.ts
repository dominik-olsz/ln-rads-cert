// Temporary helper: stores CRON_SECRET in the DB vault and probes
// reconcile-ksef's auth with three requests. Never echoes the secret.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("CRON_SECRET") ?? "";
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

  const out: Record<string, unknown> = { secret_present: secret.length > 0 };

  const { error: vaultErr } = await admin.rpc("set_cron_secret", { _value: secret });
  out.vault_write = vaultErr ? `error: ${vaultErr.message}` : "ok";

  const target = `${url}/functions/v1/reconcile-ksef`;
  const probe = async (headers: Record<string, string>) => {
    const r = await fetch(target, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: "{}" });
    const body = await r.text();
    return { status: r.status, body: body.slice(0, 500) };
  };

  out.no_auth_header = await probe({});
  out.wrong_bearer = await probe({ Authorization: "Bearer wrong-value" });
  out.correct_bearer = await probe({ Authorization: `Bearer ${secret}` });

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
