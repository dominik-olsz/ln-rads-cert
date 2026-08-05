-- app_settings: only expose non-sensitive public key
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;
CREATE POLICY "Public can read non-sensitive settings"
ON public.app_settings FOR SELECT
USING (key = 'certification_retake_price' OR public.has_role(auth.uid(), 'admin'));

-- lessons: restrict content to free lessons, purchasers, admins
DROP POLICY IF EXISTS "Lessons are viewable by everyone" ON public.lessons;
CREATE POLICY "Lesson content for free lessons, purchasers and admins"
ON public.lessons FOR SELECT
USING (
  is_free
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.course_purchases cp
    WHERE cp.course_id = lessons.course_id AND cp.user_id = auth.uid()
  )
);

-- outline helper so locked lesson titles can still be listed
CREATE OR REPLACE FUNCTION public.get_course_outline(_course_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  order_index integer,
  is_free boolean,
  content_type text,
  duration text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.title, l.order_index, l.is_free, l.content_type, l.duration
  FROM public.lessons l
  WHERE l.course_id = _course_id
  ORDER BY l.order_index
$$;
REVOKE ALL ON FUNCTION public.get_course_outline(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_course_outline(uuid) TO anon, authenticated, service_role;

-- course_materials: restrict listing to free lessons, purchasers, admins
DROP POLICY IF EXISTS "Everyone can view course materials" ON public.course_materials;
CREATE POLICY "Materials for free lessons, purchasers and admins"
ON public.course_materials FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.course_purchases cp
    WHERE cp.course_id = course_materials.course_id AND cp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = course_materials.lesson_id AND l.is_free
  )
);

-- storage: remove broad authenticated upload policy
DROP POLICY IF EXISTS "Authenticated users can upload course materials" ON storage.objects;

-- internal helper functions should not be callable from the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_course_test_questions_count() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.next_invoice_number(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;