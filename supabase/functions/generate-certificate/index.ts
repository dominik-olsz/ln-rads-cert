import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const jwt = authHeader?.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    
    if (userError) {
      console.error('Auth error:', userError);
    }
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { testAttemptId, attemptId } = await req.json();
    const actualAttemptId = testAttemptId || attemptId;
    console.log('Generating certificate for test attempt:', actualAttemptId);

    // Determine if requester is admin
    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    const isAdmin = adminRole?.role === 'admin';

    // Get test attempt details (admins can access any attempt)
    let attemptQuery = supabaseClient
      .from('test_attempts')
      .select('*, courses(title)')
      .eq('id', actualAttemptId);

    if (!isAdmin) {
      attemptQuery = attemptQuery.eq('user_id', user.id);
    }

    const { data: attempt, error: attemptError } = await attemptQuery.single();

    if (attemptError || !attempt) {
      throw new Error('Test attempt not found');
    }

    if (!attempt.passed) {
      throw new Error('Certificate can only be generated for passed tests (80%+)');
    }

    // Get user profile (for the student, not the admin)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name, certificate_name')
      .eq('id', attempt.user_id)
      .single();

    const certificateName = profile?.certificate_name || profile?.full_name || 'Student';

    // Generate certificate number
    const certificateNumber = `LNRADS-${Date.now()}-${user.id.slice(0, 8).toUpperCase()}`;

    // Create certificate record
    const certificateData: any = {
      user_id: attempt.user_id,
      test_attempt_id: actualAttemptId,
      certificate_number: certificateNumber,
    };

    // Only add course_id if it exists (certification tests might not have one)
    if (attempt.course_id) {
      certificateData.course_id = attempt.course_id;
    }

    let certificate;
    const insertResult = await supabaseClient
      .from('certificates')
      .insert(certificateData)
      .select()
      .single();

    if (insertResult.error) {
      console.error('Certificate creation error:', insertResult.error);
      // Handle duplicate by returning existing certificate
      // First, try by attempt id (idempotent)
      const { data: existingByAttempt } = await supabaseClient
        .from('certificates')
        .select('*')
        .eq('test_attempt_id', actualAttemptId)
        .maybeSingle();
      if (existingByAttempt) {
        certificate = existingByAttempt;
      } else {
        // Then, try by (user_id, course_id)
        let existingQuery = supabaseClient
          .from('certificates')
          .select('*')
          .eq('user_id', attempt.user_id);
        if (attempt.course_id) {
          existingQuery = existingQuery.eq('course_id', attempt.course_id);
        } else {
          existingQuery = existingQuery.is('course_id', null);
        }
        const { data: existingByCourse } = await existingQuery.maybeSingle();
        if (existingByCourse) {
          certificate = existingByCourse;
        } else {
          throw insertResult.error;
        }
      }
    } else {
      certificate = insertResult.data;
      console.log('Certificate created:', certificate);
    }

    // Generate HTML certificate
    const completionDate = new Date(attempt.completed_at || attempt.started_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Generate PDF certificate
    const pdfBytes = await generateCertificatePDF(
      certificateName,
      attempt.courses?.title || 'LN-RADS Certification',
      certificate.certificate_number,
      completionDate,
      attempt.score
    );

    // Also generate HTML for viewing
    const htmlContent = generateCertificateHTML(
      certificateName,
      attempt.courses?.title || 'LN-RADS Certification',
      certificate.certificate_number,
      completionDate,
      attempt.score
    );

    return new Response(
      JSON.stringify({ 
        certificateId: certificate.id,
        certificateNumber: certificate.certificate_number,
        pdf: Array.from(pdfBytes),
        html: htmlContent,
        studentName: certificateName,
        courseTitle: attempt.courses?.title,
        completionDate: completionDate,
        score: attempt.score
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

async function generateCertificatePDF(
  studentName: string,
  courseTitle: string,
  certificateNumber: string,
  completionDate: string,
  score: number
): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add decorative border
  doc.setDrawColor(212, 175, 55); // Gold color
  doc.setLineWidth(3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  
  doc.setLineWidth(0.5);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

  // Logo area (placeholder - in production, fetch and embed actual logo)
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(102, 126, 234); // Primary color
  doc.text('LN-RADS', pageWidth / 2, 35, { align: 'center' });

  // Title
  doc.setFontSize(36);
  doc.setFont('times', 'normal');
  doc.setTextColor(45, 55, 72);
  doc.text('Certificate of Completion', pageWidth / 2, 60, { align: 'center' });

  // Decorative line
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(40, 70, pageWidth - 40, 70);

  // "This certifies that"
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 85, 104);
  doc.text('This certifies that', pageWidth / 2, 85, { align: 'center' });

  // Student name
  doc.setFontSize(28);
  doc.setFont('times', 'bold');
  doc.setTextColor(26, 32, 44);
  doc.text(studentName, pageWidth / 2, 100, { align: 'center' });

  // Underline for name
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  const nameWidth = doc.getTextWidth(studentName);
  doc.line((pageWidth - nameWidth) / 2, 102, (pageWidth + nameWidth) / 2, 102);

  // "has successfully completed"
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 85, 104);
  doc.text('has successfully completed the comprehensive training program', pageWidth / 2, 115, { align: 'center' });

  // Course title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(102, 126, 234);
  doc.text(courseTitle, pageWidth / 2, 130, { align: 'center' });

  // Achievement text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 85, 104);
  doc.text('demonstrating exceptional knowledge and proficiency in radiology', pageWidth / 2, 145, { align: 'center' });

  // Score
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(72, 187, 120);
  doc.text(`Final Score: ${score}%`, pageWidth / 2, 160, { align: 'center' });

  // Signature section - left side
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(45, 55, 72);
  
  const leftX = 40;
  const rightX = pageWidth - 40;
  const signatureY = 200;
  
  // Left signature line
  doc.setDrawColor(45, 55, 72);
  doc.setLineWidth(0.3);
  doc.line(leftX - 20, signatureY, leftX + 20, signatureY);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Dr. Cezary Chudobiński', leftX, signatureY + 7, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 85, 104);
  doc.text('Program Director', leftX, signatureY + 13, { align: 'center' });

  // Right signature line (Date)
  doc.setDrawColor(45, 55, 72);
  doc.line(rightX - 20, signatureY, rightX + 20, signatureY);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(45, 55, 72);
  doc.text(completionDate, rightX, signatureY + 7, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 85, 104);
  doc.text('Date of Completion', rightX, signatureY + 13, { align: 'center' });

  // Certificate number at bottom
  doc.setFontSize(9);
  doc.setFont('courier', 'bold');
  doc.setTextColor(74, 85, 104);
  doc.text(`Certificate No: ${certificateNumber}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

  // Seal (decorative circle)
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1.5);
  doc.circle(pageWidth - 35, pageHeight - 35, 12);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(102, 126, 234);
  doc.text('VERIFIED', pageWidth - 35, pageHeight - 37, { align: 'center' });
  doc.text('COMPLETION', pageWidth - 35, pageHeight - 32, { align: 'center' });

  return doc.output('arraybuffer') as Uint8Array;
}

function generateCertificateHTML(
  studentName: string,
  courseTitle: string,
  certificateNumber: string,
  completionDate: string,
  score: number
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Georgia', serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      width: 210mm;
      height: 297mm;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10mm;
    }
    .certificate {
      background: white;
      width: 100%;
      height: 100%;
      border: 15px solid #d4af37;
      border-radius: 20px;
      padding: 40px 60px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
    }
    .certificate::before {
      content: '';
      position: absolute;
      top: 25px;
      left: 25px;
      right: 25px;
      bottom: 25px;
      border: 2px solid #d4af37;
      border-radius: 10px;
    }
    .header {
      text-align: center;
      z-index: 1;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
      letter-spacing: 3px;
    }
    .title {
      font-size: 48px;
      color: #2d3748;
      margin-bottom: 20px;
      font-weight: normal;
      letter-spacing: 2px;
    }
    .subtitle {
      font-size: 18px;
      color: #4a5568;
      margin-bottom: 30px;
    }
    .content {
      text-align: center;
      z-index: 1;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .presented-to {
      font-size: 20px;
      color: #4a5568;
      margin-bottom: 15px;
    }
    .student-name {
      font-size: 52px;
      color: #1a202c;
      font-weight: bold;
      margin-bottom: 30px;
      border-bottom: 3px solid #d4af37;
      padding-bottom: 10px;
      display: inline-block;
    }
    .completion-text {
      font-size: 18px;
      color: #4a5568;
      line-height: 1.8;
      margin-bottom: 20px;
      max-width: 700px;
    }
    .course-title {
      font-size: 28px;
      color: #667eea;
      font-weight: bold;
      margin: 20px 0;
    }
    .score {
      font-size: 22px;
      color: #48bb78;
      font-weight: bold;
      margin-top: 15px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-top: 40px;
      z-index: 1;
    }
    .signature-block {
      text-align: center;
      flex: 1;
    }
    .signature-line {
      border-top: 2px solid #2d3748;
      margin: 10px 30px;
      padding-top: 10px;
    }
    .signature-name {
      font-size: 18px;
      font-weight: bold;
      color: #2d3748;
    }
    .signature-title {
      font-size: 14px;
      color: #4a5568;
    }
    .details {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #718096;
    }
    .cert-number {
      font-weight: bold;
      color: #4a5568;
    }
    .seal {
      position: absolute;
      right: 80px;
      bottom: 80px;
      width: 120px;
      height: 120px;
      border: 4px solid #d4af37;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      z-index: 2;
    }
    .seal-inner {
      text-align: center;
      font-size: 14px;
      color: #667eea;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logo">LN-RADS</div>
      <div class="title">Certificate of Completion</div>
      <div class="subtitle">This certifies that</div>
    </div>
    
    <div class="content">
      <div class="presented-to">is hereby awarded to</div>
      <div class="student-name">${studentName}</div>
      <div class="completion-text">
        for successfully completing the comprehensive training program
      </div>
      <div class="course-title">${courseTitle}</div>
      <div class="completion-text">
        demonstrating exceptional knowledge and proficiency in radiology
      </div>
      <div class="score">Final Score: ${score}%</div>
    </div>
    
    <div class="footer">
      <div class="signature-block">
        <div class="signature-line">
          <div class="signature-name">Dr. Cezary Chudobiński</div>
          <div class="signature-title">Program Director</div>
        </div>
      </div>
      
      <div class="signature-block">
        <div class="signature-line">
          <div class="signature-name">${completionDate}</div>
          <div class="signature-title">Date of Completion</div>
        </div>
      </div>
    </div>
    
    <div class="details">
      <span class="cert-number">Certificate No: ${certificateNumber}</span>
    </div>
    
    <div class="seal">
      <div class="seal-inner">
        VERIFIED<br/>COMPLETION
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

