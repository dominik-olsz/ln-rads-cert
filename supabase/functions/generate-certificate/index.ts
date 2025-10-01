import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { testAttemptId } = await req.json();
    console.log('Generating certificate for test attempt:', testAttemptId);

    // Get test attempt details
    const { data: attempt, error: attemptError } = await supabaseClient
      .from('test_attempts')
      .select('*, courses(title)')
      .eq('id', testAttemptId)
      .eq('user_id', user.id)
      .single();

    if (attemptError || !attempt) {
      throw new Error('Test attempt not found');
    }

    if (!attempt.passed) {
      throw new Error('Certificate can only be generated for passed tests');
    }

    // Get user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Generate certificate number
    const certificateNumber = `LNRADS-${Date.now()}-${user.id.slice(0, 8).toUpperCase()}`;

    // Create certificate record
    const { data: certificate, error: certError } = await supabaseClient
      .from('certificates')
      .insert({
        user_id: user.id,
        course_id: attempt.course_id,
        test_attempt_id: testAttemptId,
        certificate_number: certificateNumber,
      })
      .select()
      .single();

    if (certError) {
      throw certError;
    }

    console.log('Certificate created:', certificate);

    // Generate simple SVG certificate
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#ffffff" stroke="#1a365d" stroke-width="8"/>
  <rect x="20" y="20" width="760" height="560" fill="none" stroke="#2c5282" stroke-width="2"/>
  
  <text x="400" y="100" font-family="serif" font-size="48" fill="#1a365d" text-anchor="middle" font-weight="bold">
    CERTIFICATE OF COMPLETION
  </text>
  
  <text x="400" y="180" font-family="sans-serif" font-size="20" fill="#2c5282" text-anchor="middle">
    This is to certify that
  </text>
  
  <text x="400" y="240" font-family="serif" font-size="36" fill="#1a365d" text-anchor="middle" font-weight="bold">
    ${profile?.full_name || 'Student'}
  </text>
  
  <text x="400" y="300" font-family="sans-serif" font-size="20" fill="#2c5282" text-anchor="middle">
    has successfully completed the course
  </text>
  
  <text x="400" y="360" font-family="serif" font-size="28" fill="#1a365d" text-anchor="middle" font-weight="bold">
    ${attempt.courses.title}
  </text>
  
  <text x="400" y="420" font-family="sans-serif" font-size="18" fill="#2c5282" text-anchor="middle">
    Score: ${attempt.score}%
  </text>
  
  <text x="400" y="480" font-family="sans-serif" font-size="16" fill="#718096" text-anchor="middle">
    Issued on ${new Date(certificate.issued_at).toLocaleDateString()}
  </text>
  
  <text x="400" y="520" font-family="monospace" font-size="14" fill="#a0aec0" text-anchor="middle">
    Certificate No: ${certificateNumber}
  </text>
</svg>`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        certificate,
        certificateSvg: svg
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error generating certificate:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
