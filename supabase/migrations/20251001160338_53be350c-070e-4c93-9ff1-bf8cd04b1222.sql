-- Create storage bucket for course materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', true);

-- Storage policies for course materials
CREATE POLICY "Course materials are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-materials');

CREATE POLICY "Authenticated users can upload course materials"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-materials' AND auth.role() = 'authenticated');

-- Insert sample LN-RADS courses
INSERT INTO public.courses (id, title, description, duration, total_lessons) VALUES
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'LI-RADS Fundamentals', 'Master the basics of Liver Imaging Reporting and Data System (LI-RADS) for hepatocellular carcinoma detection and diagnosis.', '4 hours', 8),
('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Advanced LI-RADS Interpretation', 'Deep dive into complex cases and advanced interpretation techniques for LI-RADS v2018.', '6 hours', 12),
('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'LI-RADS MRI Protocol', 'Comprehensive guide to MRI protocols and sequences for optimal LI-RADS assessment.', '3 hours', 6);

-- Insert sample lessons for LI-RADS Fundamentals
INSERT INTO public.lessons (course_id, title, content_type, content_text, order_index, duration) VALUES
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Introduction to LI-RADS', 'text', 'LI-RADS (Liver Imaging Reporting and Data System) is a standardized system for reporting and interpreting CT and MRI examinations in patients at risk for hepatocellular carcinoma (HCC). The system provides standardized terminology, diagnostic criteria, and reporting structure to facilitate communication and clinical decision-making.', 1, '30 min'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Major Features in LI-RADS', 'text', 'The four major features in LI-RADS are: 1) Arterial Phase Hyperenhancement (APHE) - increased enhancement relative to liver in arterial phase, 2) Washout - temporal reduction in enhancement relative to liver, 3) Capsule - smooth enhancing rim visible in portal venous or delayed phases, 4) Threshold Growth - size increase of 50% or more in 6 months or less.', 2, '45 min'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'LI-RADS Categories Overview', 'text', 'LI-RADS uses categories LR-1 through LR-5 and LR-M. LR-1: Definitely benign, LR-2: Probably benign, LR-3: Intermediate probability of malignancy, LR-4: Probably HCC, LR-5: Definitely HCC, LR-M: Probably or definitely malignant but not specific for HCC.', 3, '30 min'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Arterial Phase Imaging', 'text', 'Proper arterial phase timing is critical for LI-RADS assessment. Late arterial phase (LAP) is preferred, typically 17-20 seconds after aortic enhancement. This phase optimizes detection of arterial phase hyperenhancement while minimizing arterial-portal shunting that can mimic APHE.', 4, '30 min'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Portal Venous and Delayed Phases', 'text', 'Portal venous phase imaging (60-80 seconds post-injection) is essential for detecting washout appearance and capsule. Delayed phase imaging (3-5 minutes) can help confirm these findings and may show additional features. Both phases are required for complete LI-RADS assessment.', 5, '30 min'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'LR-5 Diagnostic Criteria', 'text', 'Observations are categorized as LR-5 (definitely HCC) when they meet specific size and imaging feature combinations: ≥20mm with APHE and one additional major feature (washout, capsule, or threshold growth), or 10-19mm with APHE and two or more additional major features.', 6, '45 min'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Ancillary Features', 'text', 'Ancillary features can modify an observation category when major features are indeterminate. Favoring malignancy: mild-moderate T2 hyperintensity, restricted diffusion, hepatobiliary phase hypointensity, transitional phase hypointensity. Favoring benignity: marked T2 hyperintensity, hepatobiliary phase isointensity, undistorted vessels, iron in mass.', 7, '30 min'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'LI-RADS Reporting', 'text', 'Standardized LI-RADS reporting includes: patient eligibility, technical adequacy, observation description with size and location, major and ancillary features present, assigned category, and management recommendations based on category and clinical context.', 8, '30 min');