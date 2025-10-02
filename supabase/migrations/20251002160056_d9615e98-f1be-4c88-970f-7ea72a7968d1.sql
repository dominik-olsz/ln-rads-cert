-- Allow admins to delete certificates
CREATE POLICY "Admins can delete certificates"
ON public.certificates
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));