import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const lessonId = typeof body?.lessonId === 'string' ? body.lessonId : '';

    if (!UUID_RE.test(lessonId)) {
      return json({ error: 'A valid lesson ID is required' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Resolve caller (optional — free lessons are open)
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await userClient.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const { data: lesson, error } = await admin
      .from('lessons')
      .select('id, course_id, title, content_type, content_text, content_url, is_free')
      .eq('id', lessonId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching lesson:', error);
      return json({ error: 'Failed to load lesson' }, 500);
    }
    if (!lesson) {
      return json({ error: 'Lesson not found' }, 404);
    }

    if (!lesson.is_free) {
      if (!userId) {
        return json({ error: 'Authentication required', code: 'auth_required' }, 401);
      }

      const [{ data: purchase }, { data: adminRole }] = await Promise.all([
        admin
          .from('course_purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('course_id', lesson.course_id)
          .maybeSingle(),
        admin
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle(),
      ]);

      if (!purchase && !adminRole) {
        return json({ error: 'Purchase required', code: 'purchase_required' }, 403);
      }
    }

    return json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        content_type: lesson.content_type,
        content_text: lesson.content_text,
        content_url: lesson.content_url,
      },
    });
  } catch (e) {
    console.error('Error in get-lesson-content:', e);
    return json({ error: 'An error occurred while processing your request' }, 500);
  }
});
