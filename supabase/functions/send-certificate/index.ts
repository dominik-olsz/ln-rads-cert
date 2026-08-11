import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    const { certificateId } = await req.json();
    console.log('Sending certificate email for:', certificateId);

    // Get certificate details
    const { data: certificate, error: certError } = await supabaseClient
      .from('certificates')
      .select('*, courses(title), profiles(full_name, email)')
      .eq('id', certificateId)
      .eq('user_id', user.id)
      .single();

    if (certError || !certificate) {
      throw new Error('Certificate not found');
    }

    const userEmail = certificate.profiles.email || user.email;
    const userName = certificate.profiles.full_name || 'Student';

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'LN-RADS Certification <cert@lnrads.com>',
      reply_to: 'cert@lnrads.com',
      to: [userEmail],
      subject: `Your LN-RADS Certificate - ${certificate.courses.title}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
              .content { background: #f7fafc; padding: 30px; border-radius: 8px; margin: 20px 0; }
              .certificate-box { background: white; border: 2px solid #2c5282; padding: 20px; margin: 20px 0; border-radius: 8px; }
              .footer { text-align: center; color: #718096; font-size: 14px; margin-top: 30px; }
              .button { 
                display: inline-block; 
                background: #2c5282; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 6px; 
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎓 Certificate of Completion</h1>
              </div>
              
              <div class="content">
                <h2>Congratulations, ${userName}!</h2>
                <p>You have successfully completed the course:</p>
                
                <div class="certificate-box">
                  <h3 style="color: #1a365d; margin: 0;">${certificate.courses.title}</h3>
                  <p style="margin: 10px 0 0 0; color: #718096;">Certificate No: ${certificate.certificate_number}</p>
                  <p style="margin: 5px 0 0 0; color: #718096;">Issued: ${new Date(certificate.issued_at).toLocaleDateString()}</p>
                </div>
                
                <p>Your certificate demonstrates your mastery of LI-RADS imaging principles and interpretation.</p>
                
                <p>You can download and share your certificate from your course dashboard.</p>
              </div>
              
              <div class="footer">
                <p>LN-RADS Academy - Advanced Radiology Education</p>
                <p>This email was sent to ${userEmail}</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      throw error;
    }

    console.log('Email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, emailId: data?.id || null }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error sending certificate email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
