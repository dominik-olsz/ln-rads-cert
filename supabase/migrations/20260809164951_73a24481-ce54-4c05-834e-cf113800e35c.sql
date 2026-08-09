ALTER TABLE public.test_questions
  ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.test_questions
SET options = jsonb_build_array(
  jsonb_build_object('text', COALESCE(option_a, ''), 'points', CASE WHEN upper(left(COALESCE(correct_answer,''),1)) = 'A' THEN 2 ELSE 0 END),
  jsonb_build_object('text', COALESCE(option_b, ''), 'points', CASE WHEN upper(left(COALESCE(correct_answer,''),1)) = 'B' THEN 2 ELSE 0 END),
  jsonb_build_object('text', COALESCE(option_c, ''), 'points', CASE WHEN upper(left(COALESCE(correct_answer,''),1)) = 'C' THEN 2 ELSE 0 END),
  jsonb_build_object('text', COALESCE(option_d, ''), 'points', CASE WHEN upper(left(COALESCE(correct_answer,''),1)) = 'D' THEN 2 ELSE 0 END)
)
WHERE options = '[]'::jsonb OR jsonb_array_length(options) = 0;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS certification_pass_percent integer NOT NULL DEFAULT 80;

ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS points_earned integer,
  ADD COLUMN IF NOT EXISTS points_possible integer;

ALTER TABLE public.test_questions
  ALTER COLUMN option_a DROP NOT NULL,
  ALTER COLUMN option_b DROP NOT NULL,
  ALTER COLUMN option_c DROP NOT NULL,
  ALTER COLUMN option_d DROP NOT NULL,
  ALTER COLUMN correct_answer DROP NOT NULL;