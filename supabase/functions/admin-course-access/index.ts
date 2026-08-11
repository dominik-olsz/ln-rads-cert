import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action === "revoke" ? "revoke" : "grant";
    const userId = typeof body?.userId === "string" ? body.userId : null;
    const courseId = typeof body?.courseId === "string" ? body.courseId : null;
    if (!userId || !courseId) return json({ error: "userId and courseId are required" }, 400);

    if (action === "revoke") {
      const { error } = await admin
        .from("course_purchases")
        .delete()
        .eq("user_id", userId)
        .eq("course_id", courseId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, action });

    }

    const { data: existing } = await admin
      .from("course_purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (existing) return json({ ok: true, action, alreadyHadAccess: true });

    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    const { error } = await admin.from("course_purchases").insert({
      user_id: userId,
      course_id: courseId,
      payment_status: "completed",
      amount_paid: 0,
      granted_by_admin: true,
      granted_by: user.id,
      buyer_email: profile?.email ?? null,
      buyer_name: profile?.full_name ?? null,
      discount_summary: "Granted by admin (no payment)",
    });
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true, action });
  } catch (error) {
    console.error("admin-course-access error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
