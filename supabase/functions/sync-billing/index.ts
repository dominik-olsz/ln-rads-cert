import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { syncStripeCustomer } from "../_shared/stripe-customer.ts";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Authentication required" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) return json({ error: "Authentication required" }, 401);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    // Without Stripe configured this is a no-op, not an error: the profile is
    // already saved and the details are pushed on the next purchase.
    if (!stripeKey) return json({ synced: false, reason: "stripe_not_configured" });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: profile } = await admin
      .from("profiles")
      .select(
        "buyer_type, full_name, company_name, vat_id, address_line1, address_line2, postal_code, city, country, stripe_customer_id",
      )
      .eq("id", user.id)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as any });
    const customerId = await syncStripeCustomer(stripe, admin, {
      userId: user.id,
      email: user.email,
      profile,
    });

    return json({ synced: Boolean(customerId) });
  } catch (error) {
    console.error("sync-billing error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
