ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS title_pl text,
  ADD COLUMN IF NOT EXISTS description_pl text,
  ADD COLUMN IF NOT EXISTS course_includes_pl text,
  ADD COLUMN IF NOT EXISTS what_you_learn_pl text;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS title_pl text,
  ADD COLUMN IF NOT EXISTS content_text_pl text;

ALTER TABLE public.course_materials
  ADD COLUMN IF NOT EXISTS title_pl text,
  ADD COLUMN IF NOT EXISTS explanation_pl text;

ALTER TABLE public.test_questions
  ADD COLUMN IF NOT EXISTS question_text_pl text,
  ADD COLUMN IF NOT EXISTS explanation_pl text,
  ADD COLUMN IF NOT EXISTS group_title_pl text,
  ADD COLUMN IF NOT EXISTS options_pl jsonb;

ALTER TABLE public.faq_items
  ADD COLUMN IF NOT EXISTS question_pl text,
  ADD COLUMN IF NOT EXISTS answer_pl text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- Mirror the existing column-level grants on lessons: table-level SELECT was
-- revoked for anon/authenticated, so the new non-content column needs an
-- explicit grant while the Polish lesson body stays protected.
GRANT SELECT (title_pl) ON public.lessons TO anon, authenticated;
