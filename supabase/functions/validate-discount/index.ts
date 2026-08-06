import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { computePricing, getUserDiscountPercent, lookupDiscountCode } from "../_shared/pricing.ts";

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
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json().catch(() => ({}));
    const courseId = typeof body?.courseId === "string" ? body.courseId : null;
    const type = body?.type === "certification_retake" ? "certification_retake" : "course";
    if (!courseId) return json({ error: "courseId is required" }, 400);

    // Optional auth: signed-in users also get their account discount applied.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const anon = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      );
      const { data } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
    }

    const { data: course } = await admin
      .from("courses")
      .select("id, price, discount_price, discount_valid_until, retake_price")
      .eq("id", courseId)
      .maybeSingle();
    if (!course) return json({ error: "Course not found" }, 404);

    const { code, row, error: codeError } = await lookupDiscountCode(admin, body?.code);
    if (code && codeError) return json({ error: codeError, valid: false }, 200);

    const userPercent = userId ? await getUserDiscountPercent(admin, userId) : 0;

    const pricing = type === "certification_retake"
      ? computePricing({
        basePriceEuros: Number(course.retake_price ?? 0),
        userPercent,
        codePercent: row?.percent ?? 0,
        codeId: row?.id ?? null,
        code: row?.code ?? null,
      })
      : computePricing({
        basePriceEuros: Number(course.price ?? 0),
        salePriceEuros: course.discount_price,
        saleValidUntil: course.discount_valid_until,
        userPercent,
        codePercent: row?.percent ?? 0,
        codeId: row?.id ?? null,
        code: row?.code ?? null,
      });

    return json({ valid: true, pricing: { ...pricing, codeId: undefined } });
  } catch (error) {
    console.error("validate-discount error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
