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
const LETTERS = ['A', 'B', 'C', 'D'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const questionId = typeof body?.questionId === 'string' ? body.questionId : '';
    const answer = typeof body?.answer === 'string' ? body.answer.trim().charAt(0).toUpperCase() : '';

    if (!UUID_RE.test(questionId) || !LETTERS.includes(answer)) {
      return json({ error: 'A valid question ID and answer (A-D) are required' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    const { data: question, error } = await admin
      .from('test_questions')
      .select('id, course_id, test_type, is_free, correct_answer, explanation, option_a, option_b, option_c, option_d')
      .eq('id', questionId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching question:', error);
      return json({ error: 'Failed to grade answer' }, 500);
    }
    if (!question || question.test_type !== 'course') {
      return json({ error: 'Question not available for practice feedback' }, 404);
    }

    if (!question.is_free) {
      if (!userId) {
        return json({ error: 'Authentication required', code: 'auth_required' }, 401);
      }
      const { data: purchase } = await admin
        .from('course_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', question.course_id)
        .maybeSingle();
      const { data: adminRole } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (!purchase && !adminRole) {
        return json({ error: 'Purchase required', code: 'purchase_required' }, 403);
      }
    }

    // Normalize the stored correct answer to a letter
    const raw = String(question.correct_answer ?? '').trim();
    let correctLetter = raw.charAt(0).toUpperCase();
    if (!LETTERS.includes(correctLetter)) {
      const lower = raw.toLowerCase();
      if (lower === String(question.option_a ?? '').toLowerCase()) correctLetter = 'A';
      else if (lower === String(question.option_b ?? '').toLowerCase()) correctLetter = 'B';
      else if (lower === String(question.option_c ?? '').toLowerCase()) correctLetter = 'C';
      else if (lower === String(question.option_d ?? '').toLowerCase()) correctLetter = 'D';
    }

    return json({
      correct: answer === correctLetter,
      correctAnswer: correctLetter,
      explanation: question.explanation ?? null,
    });
  } catch (e) {
    console.error('Error in check-answer:', e);
    return json({ error: 'An error occurred while processing your request' }, 500);
  }
});
