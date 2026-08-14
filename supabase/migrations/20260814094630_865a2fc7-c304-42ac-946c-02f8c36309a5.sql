CREATE TABLE public.certification_attempt_resets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  reset_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX certification_attempt_resets_user_course_key
  ON public.certification_attempt_resets (user_id, COALESCE(course_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE ON public.certification_attempt_resets TO authenticated;
GRANT ALL ON public.certification_attempt_resets TO service_role;

ALTER TABLE public.certification_attempt_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reset markers"
ON public.certification_attempt_resets
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert reset markers"
ON public.certification_attempt_resets
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reset markers"
ON public.certification_attempt_resets
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_certification_attempt_resets_updated_at
BEFORE UPDATE ON public.certification_attempt_resets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();