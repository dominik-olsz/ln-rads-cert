import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { MAX_POINTS_PER_QUESTION, pointsForAnswer } from '../_shared/questions.ts';

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
    const authHeader = req.headers.get('Authorization');
    const jwt = authHeader?.replace('Bearer ', '');

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(jwt);

    if (userError) {
      console.error('Auth getUser error:', userError);
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { courseId, answers, timePerQuestion, isCertificationTest, progressId } = await req.json();

    console.log('Submit test request:', { 
      isCertificationTest, 
      progressId, 
      courseId,
      answersCount: Object.keys(answers || {}).length 
    });

    if (!answers) {
      console.error('No answers provided');
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
      console.log('Processing certification test, progressId:', progressId);
      
      if (!progressId) {
        console.error('No progressId provided for certification test');
        return new Response(
          JSON.stringify({ error: 'Progress ID is required for certification tests' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // For certification tests, get questions from the progress record
      const { data: progressData, error: progressError } = await supabaseAdmin
        .from('certification_test_progress')
        .select('questions')
        .eq('id', progressId)
        .single();

      if (progressError) {
        console.error('Error fetching progress:', progressError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch test progress', details: progressError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get question IDs from progress
      const savedQuestions = progressData.questions as any[];
      const questionIds = savedQuestions.map((q: any) => q.id);

      console.log('Fetching correct answers for', questionIds.length, 'questions');

      // Fetch answer keys for these questions
      const { data: questionsData, error: questionsError } = await supabaseAdmin
        .from('test_questions')
        .select('id, options, correct_answer, option_a, option_b, option_c, option_d')
        .in('id', questionIds);

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
      }

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
        .select('id, options, correct_answer, option_a, option_b, option_c, option_d')
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

    // Calculate points: 2 = correct, 1 = semi-correct, 0 = wrong
    const totalQuestions = questions.length;
    let pointsEarned = 0;
    let correctCount = 0;

    questions.forEach((question: any) => {
      const points = pointsForAnswer(question, answers[question.id]);
      pointsEarned += points;
      if (points === MAX_POINTS_PER_QUESTION) correctCount++;
    });

    const pointsPossible = totalQuestions * MAX_POINTS_PER_QUESTION;
    const score = pointsPossible > 0 ? Math.round((pointsEarned / pointsPossible) * 100) : 0;

    // Passing threshold: per-course for certification tests, 80% otherwise
    let passPercent = 80;
    if (isCertificationTest && courseId) {
      const { data: courseCfg } = await supabaseAdmin
        .from('courses')
        .select('certification_pass_percent')
        .eq('id', courseId)
        .maybeSingle();
      passPercent = courseCfg?.certification_pass_percent ?? 80;
    }

    const passed = score >= passPercent;

    console.log('Test results:', { score, passed, pointsEarned, pointsPossible, passPercent });

    // Record test attempt
    const testAttemptData: any = {
      user_id: user.id,
      score,
      passed,
      total_questions: totalQuestions,
      points_earned: pointsEarned,
      points_possible: pointsPossible,
      answers: answers,
      time_per_question: timePerQuestion || {},
      is_certification_test: isCertificationTest || false
    };

    if (courseId) {
      testAttemptData.course_id = courseId;
    }


    console.log('Creating test attempt record...');

    const { data: testAttempt, error: attemptError } = await supabaseClient
      .from('test_attempts')
      .insert(testAttemptData)
      .select()
      .single();

    if (attemptError) {
      console.error('Error recording test attempt:', attemptError);
      return new Response(
        JSON.stringify({ error: 'Failed to record test attempt', details: attemptError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Test attempt recorded, ID:', testAttempt.id);

    // If certification test, mark progress as completed
    if (isCertificationTest && progressId) {
      console.log('Marking progress as completed...');
      const { error: updateError } = await supabaseAdmin
        .from('certification_test_progress')
        .update({
          is_completed: true,
          test_attempt_id: testAttempt.id
        })
        .eq('id', progressId);

      if (updateError) {
        console.error('Error updating progress:', updateError);
      }
    }

    console.log('Returning success response');

    return new Response(
      JSON.stringify({
        score,
        passed,
        passPercent,
        pointsEarned,
        pointsPossible,
        correctCount,
        totalQuestions,
        attemptId: testAttempt.id

      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in submit-test function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    
    return new Response(
      JSON.stringify({ error: errorMessage, details: errorStack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
