-- Remove level and duration from courses table
ALTER TABLE public.courses DROP COLUMN IF EXISTS level;
ALTER TABLE public.courses DROP COLUMN IF EXISTS duration;

-- Add new course fields
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_includes TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS what_you_learn TEXT;

-- Remove difficulty from test_questions and add image support
ALTER TABLE public.test_questions DROP COLUMN IF EXISTS difficulty;
ALTER TABLE public.test_questions ADD COLUMN IF NOT EXISTS image_url TEXT;