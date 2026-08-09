import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { publicOptions } from './questions.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const SELECT_COLUMNS =
  'id, lesson_id, question_text, options, option_a, option_b, option_c, option_d, correct_answer, explanation, image_url, created_at, test_type, group_title, order_index, is_free';

// Strips the answer key and exposes only the option texts.
const toSafeQuestion = (q: any) => {
  const { correct_answer, explanation, options, option_a, option_b, option_c, option_d, ...rest } = q;
  return { ...rest, options: publicOptions(q) };
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { courseId, testType } = await req.json();
    const isCourseTest = testType !== 'certification';

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Resolve the caller (optional for course tests, required for certification)
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id ?? null;
    }

    if (!courseId) {
      return json({ error: 'Course ID is required' }, 400);
    }

    const hasPurchase = async () => {
      if (!userId) return false;
      const { data } = await supabaseAdmin
        .from('course_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      return !!data;
    };

    // ---------- Course training questions ----------
    if (isCourseTest) {
      const purchased = await hasPurchase();

      let query = supabaseAdmin
        .from('test_questions')
        .select(SELECT_COLUMNS)
        .eq('course_id', courseId)
        .eq('test_type', 'course')
        .is('lesson_id', null);

      if (!purchased) query = query.eq('is_free', true);

      const { data: questions, error } = await query.order('order_index');
      if (error) {
        console.error('Error fetching questions:', error);
        return json({ error: 'Failed to retrieve test questions' }, 500);
      }

      // Never ship the answer key to the client; feedback is graded by the
      // check-answer function after the learner picks an option.
      const safeCourseQuestions = (questions ?? []).map(toSafeQuestion);



      // For visitors without access, also describe the locked groups so the
      // course outline can be shown without exposing question content.
      let lockedGroups: { group_title: string | null; order_index: number; count: number }[] = [];
      if (!purchased) {
        const { data: allMeta } = await supabaseAdmin
          .from('test_questions')
          .select('group_title, order_index, is_free')
          .eq('course_id', courseId)
          .eq('test_type', 'course')
          .is('lesson_id', null);

        const map = new Map<number, { group_title: string | null; order_index: number; count: number }>();
        (allMeta ?? [])
          .filter((q: any) => !q.is_free)
          .forEach((q: any) => {
            const order = q.order_index ?? 999;
            const entry = map.get(order) ?? { group_title: q.group_title ?? null, order_index: order, count: 0 };
            entry.count += 1;
            map.set(order, entry);
          });
        lockedGroups = Array.from(map.values()).sort((a, b) => a.order_index - b.order_index);
      }

      return json({ questions: safeCourseQuestions, purchased, lockedGroups });

    }

    // ---------- Certification test ----------
    if (!userId) {
      return json({ error: 'Authentication required' }, 401);
    }

    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id, certification_enabled, certification_mode, certification_question_count, attempts_total')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError || !course) {
      return json({ error: 'Course not found' }, 404);
    }

    if (!course.certification_enabled) {
      return json(
        { error: 'This course does not have a certification test.', code: 'no_certification_test' },
        403
      );
    }

    if (!(await hasPurchase())) {
      return json({ error: 'Purchase required', code: 'purchase_required' }, 403);
    }

    const maxAttempts = course.attempts_total ?? 3;

    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from('test_attempts')
      .select('id, passed')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('is_certification_test', true);

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
      return json({ error: 'Failed to verify attempts' }, 500);
    }

    const attemptsUsed = attempts?.length ?? 0;

    if ((attempts ?? []).some((a: any) => a.passed)) {
      return json(
        { error: 'You have already passed the certification test.', code: 'already_passed' },
        403
      );
    }

    if (attemptsUsed >= maxAttempts) {
      return json(
        { error: 'No attempts left. Please contact cert@lnrads.com.', code: 'no_attempts_left' },
        403
      );
    }

    // Attempts beyond the included ones require a paid retake credit
    const { data: courseAttemptCfg } = await supabaseAdmin
      .from('courses')
      .select('attempts_included')
      .eq('id', courseId)
      .maybeSingle();

    const attemptsIncluded = courseAttemptCfg?.attempts_included ?? 1;

    if (attemptsUsed >= attemptsIncluded) {
      const { data: credit } = await supabaseAdmin
        .from('certification_retake_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .is('consumed_at', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!credit) {
        return json(
          {
            error: 'A paid retake is required before you can take the test again.',
            code: 'retake_payment_required',
          },
          403
        );
      }

      const { error: consumeError } = await supabaseAdmin
        .from('certification_retake_purchases')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', credit.id)
        .is('consumed_at', null);

      if (consumeError) {
        console.error('Error consuming retake credit:', consumeError);
        return json({ error: 'Failed to start retake' }, 500);
      }
    }

    // Build the question set
    const mode = course.certification_mode === 'custom' ? 'custom' : 'random';
    let certQuestions: any[] = [];

    if (mode === 'custom') {
      const { data, error } = await supabaseAdmin
        .from('test_questions')
        .select(SELECT_COLUMNS)
        .eq('course_id', courseId)
        .eq('test_type', 'certification')
        .order('order_index');

      if (error) {
        console.error('Error fetching certification questions:', error);
        return json({ error: 'Failed to retrieve test questions' }, 500);
      }
      certQuestions = data ?? [];

      if (certQuestions.length === 0) {
        return json(
          { error: 'This certification test has no questions yet.', code: 'no_questions' },
          400
        );
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from('test_questions')
        .select(SELECT_COLUMNS)
        .eq('course_id', courseId)
        .eq('test_type', 'course')
        .is('lesson_id', null);

      if (error) {
        console.error('Error fetching course question pool:', error);
        return json({ error: 'Failed to retrieve test questions' }, 500);
      }

      const pool = data ?? [];
      const wanted = course.certification_question_count ?? pool.length;

      if (pool.length < wanted) {
        return json(
          {
            error: `This course only has ${pool.length} questions, but the certification test is set to ${wanted}. Please contact cert@lnrads.com.`,
            code: 'not_enough_questions',
          },
          400
        );
      }

      certQuestions = [...pool].sort(() => Math.random() - 0.5).slice(0, wanted);
    }

    // Strip answers/explanations to prevent cheating
    const safeQuestions = certQuestions.map(toSafeQuestion);


    return json({ questions: safeQuestions });
  } catch (error) {
    console.error('Error in get-test-questions function:', error);
    return json({ error: 'An error occurred while processing your request' }, 500);
  }
});
