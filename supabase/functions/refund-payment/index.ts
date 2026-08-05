import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe is not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await userClient.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const body = await req.json().catch(() => ({}));
    const invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId : null;
    const reason = ["duplicate", "fraudulent", "requested_by_customer"].includes(body?.reason)
      ? body.reason
      : "requested_by_customer";
    if (!invoiceId) return json({ error: "invoiceId is required" }, 400);

    const { data: invoice } = await admin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("doc_type", "FV")
      .maybeSingle();

    if (!invoice) return json({ error: "Invoice not found" }, 404);
    if (!invoice.stripe_payment_intent_id) {
      return json({ error: "This sale has no Stripe payment to refund" }, 400);
    }

    const { data: corrections } = await admin
      .from("invoices")
      .select("gross_amount")
      .eq("original_invoice_id", invoice.id);
    const alreadyRefunded = (corrections ?? []).reduce(
      (sum: number, c: any) => sum + Math.abs(c.gross_amount ?? 0),
      0,
    );
    const remaining = (invoice.gross_amount ?? 0) - alreadyRefunded;
    if (remaining <= 0) return json({ error: "This sale is already fully refunded" }, 400);

    const requested = Number(body?.amountCents);
    const amount = Number.isFinite(requested) && requested > 0 ? Math.round(requested) : remaining;
    if (amount > remaining) {
      return json({ error: `Maximum refundable amount is ${(remaining / 100).toFixed(2)}` }, 400);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as any });
    const refund = await stripe.refunds.create({
      payment_intent: invoice.stripe_payment_intent_id,
      amount,
      reason,
    });

    return json({ ok: true, refundId: refund.id, amount });
  } catch (error) {
    console.error("refund-payment error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
