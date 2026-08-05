-- 1) Admin policies scoped to signed-in users only
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage test questions" ON public.test_questions;
CREATE POLICY "Admins can manage test questions" ON public.test_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Only admins can view full test questions" ON public.test_questions;
CREATE POLICY "Only admins can view full test questions" ON public.test_questions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage course materials" ON public.course_materials;
CREATE POLICY "Admins can manage course materials" ON public.course_materials FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all purchases" ON public.course_purchases;
CREATE POLICY "Admins can view all purchases" ON public.course_purchases FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2) app_settings: split anon / authenticated
DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.app_settings;
CREATE POLICY "Visitors can read retake price" ON public.app_settings FOR SELECT TO anon USING (key = 'certification_retake_price');
CREATE POLICY "Users read retake price, admins read all" ON public.app_settings FOR SELECT TO authenticated USING (key = 'certification_retake_price' OR public.has_role(auth.uid(), 'admin'));

-- 3) lessons: outline stays public, content columns locked down
DROP FUNCTION IF EXISTS public.get_course_outline(uuid);
DROP POLICY IF EXISTS "Lesson content for free lessons, purchasers and admins" ON public.lessons;
CREATE POLICY "Lesson outline is viewable" ON public.lessons FOR SELECT TO anon, authenticated USING (true);
REVOKE SELECT (content_text, content_url) ON public.lessons FROM anon, authenticated;

-- 4) course_materials: free-lesson materials for visitors, purchases for users
DROP POLICY IF EXISTS "Materials for free lessons, purchasers and admins" ON public.course_materials;
CREATE POLICY "Visitors see free lesson materials" ON public.course_materials FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = course_materials.lesson_id AND l.is_free));
CREATE POLICY "Users see purchased or free materials" ON public.course_materials FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = course_materials.lesson_id AND l.is_free)
  OR EXISTS (SELECT 1 FROM public.course_purchases cp WHERE cp.course_id = course_materials.course_id AND cp.user_id = auth.uid())
);

-- 5) internal helper functions not callable from the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_course_test_questions_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_invoice_number(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;