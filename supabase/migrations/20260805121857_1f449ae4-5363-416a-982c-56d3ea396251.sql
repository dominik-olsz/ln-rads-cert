ALTER TABLE public.courses
  ADD COLUMN certification_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN certification_mode text NOT NULL DEFAULT 'random',
  ADD COLUMN certification_question_count integer,
  ADD COLUMN attempts_included integer NOT NULL DEFAULT 1,
  ADD COLUMN attempts_total integer NOT NULL DEFAULT 3,
  ADD COLUMN retake_price integer NOT NULL DEFAULT 69;

ALTER TABLE public.lessons ADD COLUMN is_free boolean NOT NULL DEFAULT false;
ALTER TABLE public.test_questions ADD COLUMN is_free boolean NOT NULL DEFAULT false;

UPDATE public.test_questions
SET course_id = 'e946f917-2e54-4bec-8b5c-43c1fb182177'
WHERE test_type = 'certification' AND course_id IS NULL;

UPDATE public.courses
SET certification_enabled = true, certification_mode = 'custom'
WHERE id = 'e946f917-2e54-4bec-8b5c-43c1fb182177';