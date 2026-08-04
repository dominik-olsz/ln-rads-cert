import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    console.error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response("Not configured", { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature!, webhookSecret);
  } catch (err) {
    console.error("Signature verification failed:", (err as Error).message);
    return new Response("Invalid signature", { status: 400, headers: corsHeaders });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status !== "paid") {
        return new Response("ignored", { status: 200, headers: corsHeaders });
      }

      const userId = session.metadata?.user_id ?? session.client_reference_id;
      const courseId = session.metadata?.course_id;

      if (!userId || !courseId) {
        console.error("Missing user_id/course_id in session", session.id);
        return new Response("Missing metadata", { status: 400, headers: corsHeaders });
      }

      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { error } = await admin.from("course_purchases").insert({
        user_id: userId,
        course_id: courseId,
        amount_paid: Math.round((session.amount_total ?? 0) / 100),
        payment_status: "completed",
        stripe_session_id: session.id,
      });

      // Unique index on stripe_session_id makes this idempotent
      if (error && error.code !== "23505") {
        console.error("Failed to record purchase:", error);
        return new Response("DB error", { status: 500, headers: corsHeaders });
      }

      console.log("Purchase recorded for", userId, courseId);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("stripe-webhook error:", error);
    return new Response("Server error", { status: 500, headers: corsHeaders });
  }
});
