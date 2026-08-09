-- Private store for downloadable lesson materials: files live under <course_id>/<filename>
CREATE POLICY "Owners and admins can read course material files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course-material-files'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.course_purchases cp
      WHERE cp.user_id = auth.uid()
        AND cp.course_id::text = (storage.foldername(storage.objects.name))[1]
    )
  )
);

CREATE POLICY "Admins can upload course material files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-material-files'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update course material files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'course-material-files'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete course material files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'course-material-files'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);