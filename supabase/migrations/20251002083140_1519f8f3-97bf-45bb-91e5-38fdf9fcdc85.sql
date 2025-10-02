-- Drop the insecure public SELECT policy on test_questions
DROP POLICY IF EXISTS "Everyone can view test questions" ON public.test_questions;

-- Add restricted SELECT policy for admins only
CREATE POLICY "Only admins can view full test questions"
ON public.test_questions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));