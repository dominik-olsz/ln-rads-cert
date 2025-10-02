-- Allow admins to insert certificates for any user
CREATE POLICY "Admins can insert certificates for any user"
ON public.certificates
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));