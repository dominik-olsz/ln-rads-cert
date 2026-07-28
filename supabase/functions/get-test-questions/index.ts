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
    // Parse request first to decide if authentication is required
    const { courseId, testType } = await req.json();
    const isCourseTest = testType === 'course';

    // For certification or other protected flows, require authentication
    let userId: string | null = null;
    if (!isCourseTest) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = user.id;
    }

    // Fetch questions using service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let query = supabaseAdmin
      .from('test_questions')
      .select('id, lesson_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, image_url, created_at, test_type, group_title, order_index');

    // For certification tests, fetch all certification questions regardless of course
    if (testType === 'certification') {
      // Check if user has already completed a certification test
      const { data: existingProgress } = await supabaseAdmin
        .from('certification_test_progress')
        .select('is_completed')
        .eq('user_id', userId as string)
        .eq('is_completed', true)
        .maybeSingle();

      if (existingProgress) {
        return new Response(
          JSON.stringify({ error: 'Certification test already completed. Retakes are not allowed.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      query = query.eq('test_type', 'certification').is('course_id', null);
    } else {
      // For course tests, fetch questions for specific course
      if (!courseId) {
        return new Response(
          JSON.stringify({ error: 'Course ID is required for course tests' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      query = query.eq('course_id', courseId).eq('test_type', 'course').is('lesson_id', null);
    }

    const { data: questions, error } = await query.order('order_index');

    if (error) {
      console.error('Error fetching questions:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve test questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Strip answer/explanation for certification tests to prevent cheating
    const safeQuestions = testType === 'certification'
      ? (questions || []).map(({ correct_answer, explanation, ...rest }: any) => rest)
      : questions;

    return new Response(
      JSON.stringify({ questions: safeQuestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-test-questions function:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
