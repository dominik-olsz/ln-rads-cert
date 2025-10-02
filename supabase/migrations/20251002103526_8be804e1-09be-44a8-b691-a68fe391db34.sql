-- Add lesson-level linkage for questions used within lessons (distinct from certification questions)
-- 1) Add nullable lesson_id to test_questions
ALTER TABLE public.test_questions
ADD COLUMN IF NOT EXISTS lesson_id UUID NULL;

-- 2) Add FK to lessons with cascade delete (safe if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'test_questions_lesson_id_fkey'
      AND table_name = 'test_questions'
  ) THEN
    ALTER TABLE public.test_questions
    ADD CONSTRAINT test_questions_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id)
    ON DELETE CASCADE;
  END IF;
END$$;

-- 3) Performance index for queries by course + lesson
CREATE INDEX IF NOT EXISTS idx_test_questions_course_lesson
ON public.test_questions (course_id, lesson_id);
