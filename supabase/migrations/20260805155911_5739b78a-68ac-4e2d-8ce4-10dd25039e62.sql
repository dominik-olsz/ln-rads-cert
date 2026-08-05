CREATE POLICY "Admins can read invoice files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'::app_role));
