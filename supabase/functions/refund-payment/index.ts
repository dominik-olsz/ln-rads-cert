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

/**
 * Settles a correction that already exists in FakturaXL.
 *
 * FakturaXL is the single source of truth: the admin issues the correction there
 * by hand, the sync pass imports it as an FK row with the refundable difference,
 * and this function only moves the money — either through Stripe or by recording
 * that it was settled outside Stripe (bank transfer, etc.). It never creates a
 * document, so a refund can never mint a second correction number.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const body = await req.json().catch(() => ({}));
    const invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId : null;
    const method = body?.method === "manual" ? "manual" : "stripe";
    const reason = ["duplicate", "fraudulent", "requested_by_customer"].includes(body?.reason)
      ? body.reason
      : "requested_by_customer";
    if (!invoiceId) return json({ error: "invoiceId is required" }, 400);

    // The row must be a correction imported from FakturaXL.
    const { data: correction } = await admin
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("doc_type", "FK")
      .maybeSingle();

    if (!correction) {
      return json(
        {
          error:
            "No correction found for this row. Issue the correction in FakturaXL first, then run the sync to import it.",
        },
        404,
      );
    }
    if (correction.settlement_status && correction.settlement_status !== "awaiting") {
      return json({ error: "This correction is already settled" }, 409);
    }

    const refundable = Math.abs(Number(correction.refundable_amount ?? correction.gross_amount ?? 0));
    if (!refundable) {
      return json({ error: "This correction has no amount to refund" }, 400);
    }

    const { data: original } = correction.original_invoice_id
      ? await admin
          .from("invoices")
          .select("*")
          .eq("id", correction.original_invoice_id)
          .maybeSingle()
      : { data: null };

    if (!original) {
      return json(
        { error: "The corrected invoice is not in the system — run the sync first" },
        409,
      );
    }

    let refundId: string | null = null;

    if (method === "stripe") {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) return json({ error: "Stripe is not configured" }, 500);
      if (!original.stripe_payment_intent_id) {
        return json(
          { error: "This sale has no Stripe payment — settle the correction manually instead" },
          400,
        );
      }

      const alreadyRefunded = Number(original.stripe_refunded_amount ?? 0);
      const remaining = Number(original.gross_amount ?? 0) - alreadyRefunded;
      if (refundable > remaining) {
        return json(
          {
            error: `Stripe can still refund at most ${(remaining / 100).toFixed(2)} on this payment, but the correction asks for ${(refundable / 100).toFixed(2)}`,
          },
          400,
        );
      }

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as any });
      // The correction id is the idempotency key: replaying this call — or a
      // crash between the refund and the row update — cannot double-refund.
      const refund = await stripe.refunds.create(
        {
          payment_intent: original.stripe_payment_intent_id,
          amount: refundable,
          reason,
          metadata: { correction_invoice: correction.invoice_number ?? "", correction_id: correction.id },
        },
        { idempotencyKey: `fk-settle-${correction.id}` },
      );
      refundId = refund.id;

      await admin
        .from("invoices")
        .update({ stripe_refunded_amount: alreadyRefunded + refundable })
        .eq("id", original.id);
    }

    // The money has moved (or was settled outside Stripe) — record it. If this
    // write failed we would still be protected on retry by the idempotency key.
    const { error: settleError } = await admin
      .from("invoices")
      .update({
        settlement_status: method,
        stripe_refund_id: refundId,
        settled_at: new Date().toISOString(),
        settled_by: user.id,
      })
      .eq("id", correction.id);
    if (settleError) {
      return json(
        {
          error: `Refund of ${(refundable / 100).toFixed(2)} succeeded but could not be recorded: ${settleError.message}`,
          refundId,
        },
        500,
      );
    }

    // Access follows the corrected total: only a correction down to zero revokes
    // the purchase, a partial one just records how much came back.
    const correctedTotal = Number(
      correction.corrected_total_amount ??
        Math.max(0, Number(original.gross_amount ?? 0) - refundable),
    );
    const totalRefunded = Math.max(0, Number(original.gross_amount ?? 0) - correctedTotal);
    const fullRefund = correctedTotal <= 0;

    if (original.purchase_type === "certification_retake" && original.retake_purchase_id) {
      if (fullRefund) {
        await admin
          .from("certification_retake_purchases")
          .delete()
          .eq("id", original.retake_purchase_id)
          .is("consumed_at", null);
      } else {
        await admin
          .from("certification_retake_purchases")
          .update({ refunded_amount: totalRefunded, refunded_at: new Date().toISOString() })
          .eq("id", original.retake_purchase_id);
      }
    } else if (original.course_purchase_id) {
      if (fullRefund) {
        await admin.from("course_purchases").delete().eq("id", original.course_purchase_id);
      } else {
        await admin
          .from("course_purchases")
          .update({
            refunded_amount: totalRefunded,
            refunded_at: new Date().toISOString(),
            payment_status: "partially_refunded",
          })
          .eq("id", original.course_purchase_id);
      }
    }

    return json({
      ok: true,
      method,
      refundId,
      amount: refundable,
      corrected_total: correctedTotal,
      access_revoked: fullRefund,
    });
  } catch (error) {
    console.error("refund-payment error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
