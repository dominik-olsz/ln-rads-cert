import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { courseId, answers } = await req.json();

    if (!courseId || !answers) {
      return new Response(
        JSON.stringify({ error: 'Course ID and answers are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch correct answers using service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: questions, error } = await supabaseAdmin
      .from('test_questions')
      .select('id, correct_answer')
      .eq('course_id', courseId);

    if (error) {
      console.error('Error fetching questions:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate score
    let correctCount = 0;
    const totalQuestions = questions.length;

    questions.forEach(question => {
      if (answers[question.id] === question.correct_answer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 70; // 70% passing grade

    // Record test attempt
    const { data: testAttempt, error: attemptError } = await supabaseClient
      .from('test_attempts')
      .insert({
        user_id: user.id,
        course_id: courseId,
        score,
        passed,
        total_questions: totalQuestions,
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Error recording test attempt:', attemptError);
      return new Response(
        JSON.stringify({ error: 'Failed to record test attempt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        score, 
        passed, 
        correctCount, 
        totalQuestions,
        testAttemptId: testAttempt.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in submit-test function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
