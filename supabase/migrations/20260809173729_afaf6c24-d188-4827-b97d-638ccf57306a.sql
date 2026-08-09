-- Restrict direct reads of paid lesson body content to metadata-only columns.
REVOKE SELECT ON public.lessons FROM anon, authenticated;

GRANT SELECT (id, course_id, title, content_type, order_index, duration, created_at, is_free)
  ON public.lessons TO anon, authenticated;

-- Admins still need full write access (content columns included)
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;