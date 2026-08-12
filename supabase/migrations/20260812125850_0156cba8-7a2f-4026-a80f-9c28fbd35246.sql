CREATE TABLE public.faq_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  answer text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faq_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_items TO authenticated;
GRANT ALL ON public.faq_items TO service_role;

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published FAQ items"
ON public.faq_items FOR SELECT TO anon, authenticated
USING (is_published OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert FAQ items"
ON public.faq_items FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update FAQ items"
ON public.faq_items FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete FAQ items"
ON public.faq_items FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_faq_items_updated_at
BEFORE UPDATE ON public.faq_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.faq_items (question, answer, order_index) VALUES
('What is LN-RADS?', 'LN-RADS (Lymph Nodes Reporting and Data System) is an innovative multiparametric approach for diagnosing lymph nodes. It enables detection of macrometastases as small as 2-3mm and improves diagnostic accuracy by over 20% compared to traditional methods.', 1),
('Who should take the LN-RADS certification course?', 'This certification is designed for radiologists, oncologists, and medical professionals involved in lymph node imaging and diagnosis across all modalities including US, CT, MR, and PET.', 2),
('How many questions are in the certification exam?', 'The certification exam consists of 100 questions covering all aspects of LN-RADS methodology and application across different imaging modalities.', 3),
('What is the passing score?', 'You need to achieve a minimum score of 80% to pass the certification exam and receive your official LN-RADS certification.', 4),
('What imaging modalities are covered?', 'The LN-RADS certification covers all major imaging modalities including Ultrasound (US), Computed Tomography (CT), Magnetic Resonance (MR), and Positron Emission Tomography (PET).', 5),
('Is the certification recognized internationally?', 'Yes, the LN-RADS certification is an official certification program recognized globally by medical institutions and professional organizations.', 6),
('Will I receive a certificate upon completion?', 'Upon successfully passing the exam with 80% or higher, you will receive an official LN-RADS certification that validates your expertise in lymph node assessment.', 7),
('What happens after I complete the certification?', 'After certification, you''ll have access to your certificate in your dashboard, which you can download and share. You''ll also be part of our certified professionals network.', 8),
('Do I need prior experience in radiology?', 'While basic knowledge of medical imaging is helpful, the course is designed to be comprehensive and includes foundational concepts. However, it''s primarily intended for healthcare professionals with some background in diagnostic imaging.', 9),
('Is there a time limit for completing the exam?', 'The certification exam has a reasonable time limit to ensure focused completion. Specific time details will be provided when you begin the exam.', 10);