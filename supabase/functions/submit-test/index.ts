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

    const { courseId, answers, timePerQuestion, isCertificationTest, progressId } = await req.json();

    if (!answers) {
      return new Response(
        JSON.stringify({ error: 'Answers are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch correct answers using service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let questions;
    let error;

    if (isCertificationTest) {
      // For certification tests, get questions from the progress record
      const { data: progressData, error: progressError } = await supabaseAdmin
        .from('certification_test_progress')
        .select('questions')
        .eq('id', progressId)
        .single();

      if (progressError) {
        console.error('Error fetching progress:', progressError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch test progress' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get question IDs from progress
      const savedQuestions = progressData.questions as any[];
      const questionIds = savedQuestions.map((q: any) => q.id);

      // Fetch correct answers for these questions
      const { data: questionsData, error: questionsError } = await supabaseAdmin
        .from('test_questions')
        .select('id, correct_answer')
        .in('id', questionIds);

      questions = questionsData;
      error = questionsError;
    } else {
      // For course tests
      if (!courseId) {
        return new Response(
          JSON.stringify({ error: 'Course ID is required for course tests' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: questionsData, error: questionsError } = await supabaseAdmin
        .from('test_questions')
        .select('id, correct_answer')
        .eq('course_id', courseId);

      questions = questionsData;
      error = questionsError;
    }

    if (error || !questions) {
      console.error('Error fetching questions:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate score
    let correctCount = 0;
    const totalQuestions = questions.length;

    questions.forEach((question: any) => {
      if (answers[question.id] === question.correct_answer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 80; // 80% passing grade

    // Record test attempt
    const testAttemptData: any = {
      user_id: user.id,
      score,
      passed,
      total_questions: totalQuestions,
      answers: answers,
      time_per_question: timePerQuestion || {},
      is_certification_test: isCertificationTest || false
    };

    if (courseId) {
      testAttemptData.course_id = courseId;
    }

    const { data: testAttempt, error: attemptError } = await supabaseClient
      .from('test_attempts')
      .insert(testAttemptData)
      .select()
      .single();

    if (attemptError) {
      console.error('Error recording test attempt:', attemptError);
      return new Response(
        JSON.stringify({ error: 'Failed to record test attempt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If certification test, mark progress as completed
    if (isCertificationTest && progressId) {
      await supabaseAdmin
        .from('certification_test_progress')
        .update({
          is_completed: true,
          test_attempt_id: testAttempt.id
        })
        .eq('id', progressId);
    }

    return new Response(
      JSON.stringify({ 
        score, 
        passed, 
        correctCount, 
        totalQuestions,
        attemptId: testAttempt.id
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
