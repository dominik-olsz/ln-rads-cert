import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { computePricing, getUserDiscountPercent, lookupDiscountCode } from "../_shared/pricing.ts";
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
    // Kill switch: purchases stay blocked unless STRIPE_SECRET_KEY and
    // STRIPE_WEBHOOK_SECRET are a confirmed matched pair (same Stripe mode).
    if (Deno.env.get("PAYMENTS_ENABLED") !== "true") {
      return json({
        error:
          "Purchases are temporarily unavailable while payments are being reconfigured. Please try again later.",
        disabled: true,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe is not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Authentication required" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) return json({ error: "Authentication required" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json().catch(() => ({}));
    const purchaseType = body?.type === "certification_retake" ? "certification_retake" : "course";
    const courseId = typeof body?.courseId === "string" ? body.courseId : null;
    const origin = req.headers.get("origin") ?? "";

    // Discounts are always recomputed here — the client never sets a price.
    const { code, row: codeRow, error: codeError } = await lookupDiscountCode(admin, body?.code);
    if (code && codeError) return json({ error: codeError }, 400);
    const userPercent = await getUserDiscountPercent(admin, user.id);

    const stripeInit = () => new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as any });

    // Saved invoice details (Account settings) are used to pre-fill Stripe Checkout.
    const { data: profile } = await admin
      .from("profiles")
      .select(
        "buyer_type, full_name, company_name, vat_id, address_line1, address_line2, postal_code, city, country, stripe_customer_id",
      )
      .eq("id", user.id)
      .maybeSingle();

    const buildCustomer = async (stripe: Stripe): Promise<string | undefined> =>
      await syncStripeCustomer(stripe, admin, {
        userId: user.id,
        email: user.email,
        profile,
      });

    const customerUpdate = { address: "auto", name: "auto" } as const;
    // Nothing about the buyer type is carried over from the profile: the
    // company name and VAT ID always come from what the buyer enters at
    // Checkout, so both a private and a business purchase stay possible.

    const redeemCode = async (extra: Record<string, unknown> = {}) => {
      if (!codeRow) return;
      await admin
        .from("discount_codes")
        .update({
          redeemed_by: user.id,
          redeemed_at: new Date().toISOString(),
          redeemed_email: user.email ?? null,
          is_active: false,
          ...extra,
        })
        .eq("id", codeRow.id)
        .is("redeemed_at", null);
    };

    if (purchaseType === "certification_retake") {
      if (!courseId) return json({ error: "courseId is required" }, 400);

      const { data: retakeCourse } = await admin
        .from("courses")
        .select("id, title, certification_enabled, attempts_included, attempts_total, retake_price")
        .eq("id", courseId)
        .maybeSingle();

      if (!retakeCourse) return json({ error: "Course not found" }, 404);
      if (!retakeCourse.certification_enabled) {
        return json({ error: "This course does not have a certification test" }, 400);
      }

      const { data: attempts } = await admin
        .from("test_attempts")
        .select("id, passed")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .eq("is_certification_test", true);

      const attemptsUsed = attempts?.length ?? 0;
      const attemptsIncluded = retakeCourse.attempts_included ?? 1;
      const attemptsTotal = retakeCourse.attempts_total ?? 3;

      if ((attempts ?? []).some((a: any) => a.passed)) {
        return json({ error: "You have already passed the certification test" }, 400);
      }
      if (attemptsUsed < attemptsIncluded) {
        return json({ error: "You still have an attempt included with your course" }, 400);
      }
      if (attemptsUsed >= attemptsTotal) {
        return json({ error: "No attempts left. Please contact cert@lnrads.com." }, 400);
      }

      const { data: unused } = await admin
        .from("certification_retake_purchases")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .is("consumed_at", null)
        .maybeSingle();

      if (unused) {
        return json({ error: "You already have a paid retake available" }, 400);
      }

      const pricing = computePricing({
        basePriceEuros: Number(retakeCourse.retake_price ?? 0),
        userPercent,
        codePercent: codeRow?.percent ?? 0,
        codeId: codeRow?.id ?? null,
        code: codeRow?.code ?? null,
      });

      if (pricing.baseCents <= 0) {
        return json({ error: "Retake price is not configured" }, 500);
      }

      // Fully discounted: grant the retake immediately, no Stripe charge.
      if (pricing.isFree) {
        await admin.from("certification_retake_purchases").insert({
          user_id: user.id,
          course_id: retakeCourse.id,
          amount_paid: 0,
          buyer_email: user.email ?? null,
          discount_code_id: pricing.codeId,
          discount_summary: pricing.discountSummary,
        });
        await redeemCode();
        return json({ free: true, url: null });
      }

      const stripe = stripeInit();
      const retakeCustomerId = await buildCustomer(stripe);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: user.id,
        customer: retakeCustomerId,
        customer_email: retakeCustomerId ? undefined : (user.email ?? undefined),
        customer_update: retakeCustomerId ? customerUpdate : undefined,
        billing_address_collection: "required",
        // Optional: private buyers can continue without a VAT ID, while
        // business buyers can choose to add one for their invoice.
        tax_id_collection: { enabled: true },
        // Prices are net; Stripe Tax adds the buyer's VAT (and applies EU
        // reverse charge for validated business VAT IDs).
        // This seller issues its own Polish invoices, so Stripe must calculate
        // tax against the seller account. Account-level Managed Payments would
        // make Stripe the liable merchant and can incorrectly reverse-charge a
        // Polish buyer with a Polish VAT ID.
        ...({ managed_payments: { enabled: false } } as any),
        automatic_tax: { enabled: true },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: pricing.finalCents,
              tax_behavior: "exclusive",
              product_data: {
                name: `Certification exam retake — ${retakeCourse.title}`,
                description: pricing.discountSummary
                  ? `Discounts applied: ${pricing.discountSummary}`
                  : undefined,
                tax_code: "txcd_10103001",
              },
            },
          },
        ],
        metadata: {
          user_id: user.id,
          course_id: retakeCourse.id,
          purchase_type: "certification_retake",
          discount_code_id: pricing.codeId ?? "",
          discount_summary: pricing.discountSummary ?? "",
        },
        success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=certification_retake&course_id=${retakeCourse.id}`,
        cancel_url: `${origin}/certification-test?courseId=${retakeCourse.id}&payment=cancelled`,
      });

      // The code is marked as redeemed by the webhook once payment succeeds.
      return json({ url: session.url });
    }


    if (!courseId) return json({ error: "courseId is required" }, 400);


    // Trust only the DB price
    const { data: course, error: courseError } = await admin
      .from("courses")
      .select("id, title, price, discount_price, discount_valid_until")
      .eq("id", courseId)
      .single();

    if (courseError || !course) return json({ error: "Course not found" }, 404);
    if (!course.price || course.price <= 0) {
      return json({ error: "This course is free" }, 400);
    }

    // Already owned?
    const { data: existing } = await admin
      .from("course_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existing) return json({ error: "You already own this course" }, 400);

    const pricing = computePricing({
      basePriceEuros: Number(course.price),
      salePriceEuros: course.discount_price,
      saleValidUntil: course.discount_valid_until,
      userPercent,
      codePercent: codeRow?.percent ?? 0,
      codeId: codeRow?.id ?? null,
      code: codeRow?.code ?? null,
    });

    // 100% discount: enrol without Stripe.
    if (pricing.isFree) {
      const { data: freeRow } = await admin
        .from("course_purchases")
        .insert({
          user_id: user.id,
          course_id: course.id,
          amount_paid: 0,
          payment_status: "completed",
          buyer_email: user.email ?? null,
          discount_code_id: pricing.codeId,
          discount_summary: pricing.discountSummary,
        })
        .select()
        .maybeSingle();
      await redeemCode();
      return json({ free: true, url: null, purchaseId: freeRow?.id ?? null });
    }

    const stripe = stripeInit();
    const courseCustomerId = await buildCustomer(stripe);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: user.id,
      customer: courseCustomerId,
      customer_email: courseCustomerId ? undefined : (user.email ?? undefined),
      customer_update: courseCustomerId ? customerUpdate : undefined,
      billing_address_collection: "required",
      // Optional: private buyers can continue without a VAT ID, while
      // business buyers can choose to add one for their invoice.
      tax_id_collection: { enabled: true },
      // Prices are net; Stripe Tax adds the buyer's VAT at checkout.
      // Keep tax liability with this Polish seller. If Managed Payments is left
      // to the account default, Stripe can classify domestic PL B2B sales as
      // cross-border and return reverse-charge 0% VAT.
      ...({ managed_payments: { enabled: false } } as any),
      automatic_tax: { enabled: true },
      line_items: [

        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: pricing.finalCents,
            tax_behavior: "exclusive",
            product_data: {
              name: course.title,
              description: pricing.discountSummary
                ? `Discounts applied: ${pricing.discountSummary}`
                : undefined,
              tax_code: "txcd_10103001", // Digital education / online course
            },
          },
        },
      ],
      metadata: {
        user_id: user.id,
        course_id: course.id,
        purchase_type: "course",
        discount_code_id: pricing.codeId ?? "",
        discount_summary: pricing.discountSummary ?? "",
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&course_id=${course.id}`,
      cancel_url: `${origin}/course/${course.id}?payment=cancelled`,
    });

    // The code is marked as redeemed by the webhook once payment succeeds.
    return json({ url: session.url });
  } catch (error) {
    console.error("create-checkout error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
