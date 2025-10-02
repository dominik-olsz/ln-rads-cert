-- Update test_attempts to track individual answers and timing
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS answers JSONB;
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS time_per_question JSONB;

-- Add certificate name field to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS certificate_name TEXT;