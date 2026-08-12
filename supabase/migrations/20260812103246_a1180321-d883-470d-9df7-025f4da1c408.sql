GRANT SELECT (id, course_id, title, content_type, order_index, duration, created_at, is_free) ON public.lessons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;