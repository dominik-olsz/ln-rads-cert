import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import {
  MAX_POINTS_PER_QUESTION,
  correctIndexes,
  normalizeOptions,
  pointsForAnswer,
  resolveAnswerIndex,
  semiCorrectIndexes,
} from './questions.ts';

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
    const questionId = typeof body?.questionId === 'string' ? body.questionId : '';
    const rawAnswer = body?.optionIndex ?? body?.answer;
    const answerIndex = resolveAnswerIndex(rawAnswer);

    if (!UUID_RE.test(questionId) || answerIndex < 0) {
      return json({ error: 'A valid question ID and selected option are required' }, 400);
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
      .select('id, course_id, test_type, is_free, options, correct_answer, explanation, option_a, option_b, option_c, option_d')
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

    const options = normalizeOptions(question);
    if (answerIndex >= options.length) {
      return json({ error: 'Invalid option selected' }, 400);
    }

    const points = pointsForAnswer(question, answerIndex);

    return json({
      points,
      maxPoints: MAX_POINTS_PER_QUESTION,
      correct: points === MAX_POINTS_PER_QUESTION,
      correctIndexes: correctIndexes(question),
      semiCorrectIndexes: semiCorrectIndexes(question),
      explanation: question.explanation ?? null,
    });
  } catch (e) {
    console.error('Error in check-answer:', e);
    return json({ error: 'An error occurred while processing your request' }, 500);
  }
});
