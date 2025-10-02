-- Add RLS policy for admins to view all certificates
CREATE POLICY "Admins can view all certificates"
ON public.certificates
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));