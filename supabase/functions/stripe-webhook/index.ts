import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { buyerFromSession, createInvoice } from "../_shared/invoice.ts";

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

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as any });
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature!, webhookSecret);
  } catch (err) {
    console.error("Signature verification failed:", (err as Error).message);
    return new Response("Invalid signature", { status: 400, headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const ok = () =>
    new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (event.type === "checkout.session.completed") {
      const bare = event.data.object as Stripe.Checkout.Session;

      // Re-fetch with tax ids expanded so the invoice can carry the buyer's VAT ID.
      let session = bare;
      try {
        session = (await stripe.checkout.sessions.retrieve(bare.id, {
          expand: ["customer_details.tax_ids"],
        })) as Stripe.Checkout.Session;
      } catch (e) {
        console.error("Could not expand session, using webhook payload:", (e as Error).message);
      }

      if (session.payment_status !== "paid") {
        return new Response("ignored", { status: 200, headers: corsHeaders });
      }

      const userId = session.metadata?.user_id ?? session.client_reference_id;
      const courseId = session.metadata?.course_id;
      const purchaseType = session.metadata?.purchase_type ?? "course";
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;
      const buyer = buyerFromSession(session);
      const discountCodeId = session.metadata?.discount_code_id || null;
      const discountSummary = session.metadata?.discount_summary || null;

      // Lock the single-use discount code now that payment succeeded.
      const redeemDiscountCode = async () => {
        if (!discountCodeId) return;
        await admin
          .from("discount_codes")
          .update({
            redeemed_by: userId ?? null,
            redeemed_at: new Date().toISOString(),
            redeemed_email: buyer.email ?? null,
            is_active: false,
          })
          .eq("id", discountCodeId)
          .is("redeemed_at", null);
      };
      const grossCents = session.amount_total ?? 0;
      const currency = session.currency ?? "eur";

      // The buyer's latest entry in Checkout is the most current, so /account is
      // always refreshed from the completed session.
      if (userId && buyer.address_line1) {
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
        await admin
          .from("profiles")
          .update({
            buyer_type: buyer.vat_id ? "company" : "private",
            company_name: buyer.company ?? null,
            vat_id: buyer.vat_id ?? null,
            address_line1: buyer.address_line1,
            address_line2: buyer.address_line2 ?? null,
            postal_code: buyer.postal_code ?? null,
            city: buyer.city ?? null,
            country: buyer.country ?? null,
            ...(customerId ? { stripe_customer_id: customerId } : {}),
          })
          .eq("id", userId);
      }



      if (purchaseType === "certification_retake") {
        if (!userId) {
          console.error("Missing user_id in retake session", session.id);
          return new Response("Missing metadata", { status: 400, headers: corsHeaders });
        }

        const { data: retakeRow, error: retakeError } = await admin
          .from("certification_retake_purchases")
          .insert({
            user_id: userId,
            course_id: courseId ?? null,
            amount_paid: grossCents,
            stripe_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            buyer_email: buyer.email,
            buyer_name: buyer.name,
            discount_code_id: discountCodeId,
            discount_summary: discountSummary,
          })
          .select()
          .maybeSingle();

        if (retakeError && retakeError.code !== "23505") {
          console.error("Failed to record retake purchase:", retakeError);
          return new Response("DB error", { status: 500, headers: corsHeaders });
        }

        await redeemDiscountCode();

        if (retakeRow) {
          const { data: course } = await admin
            .from("courses")
            .select("title")
            .eq("id", courseId ?? "")
            .maybeSingle();
          await createInvoice(admin, {
            userId,
            courseId: courseId ?? null,
            purchaseType: "certification_retake",
            retakePurchaseId: retakeRow.id,
            stripeSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            buyer,
            currency,
            grossCents,
            discountCodeId,
            discountSummary,
            lineItems: [
              {
                description: `Certification exam retake — ${course?.title ?? "Certification"}`
                  + (discountSummary ? ` (${discountSummary})` : ""),
                quantity: 1,
                gross: grossCents,
              },
            ],
          }).catch((e) => console.error("Retake invoice failed:", e));
        }

        return ok();
      }

      if (!userId || !courseId) {
        console.error("Missing user_id/course_id in session", session.id);
        return new Response("Missing metadata", { status: 400, headers: corsHeaders });
      }

      const { data: purchaseRow, error } = await admin
        .from("course_purchases")
        .insert({
          user_id: userId,
          course_id: courseId,
          amount_paid: Math.round(grossCents / 100),
          payment_status: "completed",
          stripe_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          buyer_email: buyer.email,
          buyer_name: buyer.name,
          discount_code_id: discountCodeId,
          discount_summary: discountSummary,
        })
        .select()
        .maybeSingle();

      // Unique index on stripe_session_id makes this idempotent
      if (error && error.code !== "23505") {
        console.error("Failed to record purchase:", error);
        return new Response("DB error", { status: 500, headers: corsHeaders });
      }

      await redeemDiscountCode();

      if (purchaseRow) {
        const { data: course } = await admin
          .from("courses")
          .select("title")
          .eq("id", courseId)
          .maybeSingle();
        await createInvoice(admin, {
          userId,
          courseId,
          purchaseType: "course",
          coursePurchaseId: purchaseRow.id,
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          buyer,
          currency,
          grossCents,
          discountCodeId,
          discountSummary,
          lineItems: [
            {
              description: (course?.title ?? "Online course")
                + (discountSummary ? ` (${discountSummary})` : ""),
              quantity: 1,
              gross: grossCents,
            },
          ],
        }).catch((e) => console.error("Course invoice failed:", e));
      }

      console.log("Purchase recorded for", userId, courseId);
      return ok();
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id ?? null;
      if (!paymentIntentId) return ok();

      const refundedCents = charge.amount_refunded ?? 0;

      const { data: original } = await admin
        .from("invoices")
        .select("*")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .eq("doc_type", "FV")
        .maybeSingle();

      if (!original) {
        console.log("No invoice for refunded charge", paymentIntentId);
        return ok();
      }

      // Amount already credited by earlier correction invoices
      const { data: corrections } = await admin
        .from("invoices")
        .select("gross_amount")
        .eq("original_invoice_id", original.id);
      const alreadyCredited = (corrections ?? []).reduce(
        (sum: number, c: any) => sum + Math.abs(c.gross_amount ?? 0),
        0,
      );
      const delta = refundedCents - alreadyCredited;
      if (delta <= 0) return ok();

      await createInvoice(admin, {
        docType: "FK",
        originalInvoiceId: original.id,
        originalInvoiceNumber: original.invoice_number,
        userId: original.user_id,
        courseId: original.course_id,
        purchaseType: original.purchase_type,
        coursePurchaseId: original.course_purchase_id,
        retakePurchaseId: original.retake_purchase_id,
        stripePaymentIntentId: paymentIntentId,
        buyer: {
          name: original.buyer_name,
          company: original.buyer_company,
          email: original.buyer_email,
          address_line1: original.buyer_address_line1,
          address_line2: original.buyer_address_line2,
          postal_code: original.buyer_postal_code,
          city: original.buyer_city,
          country: original.buyer_country,
          vat_id: original.buyer_vat_id,
        },
        currency: original.currency,
        grossCents: -delta,
        refundReason: "zwrot płatności / refund",
        lineItems: (original.line_items ?? []).map((li: any) => ({
          description: `Korekta / Correction — ${li.description}`,
          quantity: li.quantity ?? 1,
          gross: -delta,
        })),
      }).catch((e) => console.error("Correction invoice failed:", e));

      // A full refund revokes access; a partial one only records the amount
      const fullRefund = refundedCents >= (original.gross_amount ?? 0);
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
            .update({ refunded_amount: refundedCents, refunded_at: new Date().toISOString() })
            .eq("id", original.retake_purchase_id);
        }
      } else if (original.course_purchase_id) {
        if (fullRefund) {
          await admin.from("course_purchases").delete().eq("id", original.course_purchase_id);
        } else {
          await admin
            .from("course_purchases")
            .update({
              refunded_amount: refundedCents,
              refunded_at: new Date().toISOString(),
              payment_status: "partially_refunded",
            })
            .eq("id", original.course_purchase_id);
        }
      }

      return ok();
    }

    return ok();
  } catch (error) {
    console.error("stripe-webhook error:", error);
    return new Response("Server error", { status: 500, headers: corsHeaders });
  }
});
