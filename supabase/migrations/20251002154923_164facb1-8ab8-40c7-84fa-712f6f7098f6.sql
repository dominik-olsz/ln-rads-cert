-- Add RLS policies for admins to manage test attempts and progress

-- Allow admins to delete test attempts
CREATE POLICY "Admins can delete test attempts"
ON public.test_attempts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete certification test progress
CREATE POLICY "Admins can delete certification test progress"
ON public.certification_test_progress
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all test attempts
CREATE POLICY "Admins can view all test attempts"
ON public.test_attempts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));