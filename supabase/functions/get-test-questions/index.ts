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

    // Public function: authentication not required
    // (We still create a client in case we want to tailor results by user in the future)


    const { courseId, testType } = await req.json();

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
        JSON.stringify({ error: 'Failed to fetch questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return questions WITHOUT correct_answer and explanation
    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-test-questions function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
