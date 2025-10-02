-- Add title column to test_questions for group naming
ALTER TABLE public.test_questions 
ADD COLUMN IF NOT EXISTS group_title text;