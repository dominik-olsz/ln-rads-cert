-- Create table to track certification test progress
CREATE TABLE IF NOT EXISTS public.certification_test_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  time_left INTEGER NOT NULL DEFAULT 30,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  test_attempt_id UUID REFERENCES public.test_attempts(id),
  UNIQUE(user_id, is_completed)
);

-- Enable RLS
ALTER TABLE public.certification_test_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view their own certification test progress"
ON public.certification_test_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert their own certification test progress"
ON public.certification_test_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update their own certification test progress"
ON public.certification_test_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Add column to test_attempts to track if it's a certification test
ALTER TABLE public.test_attempts 
ADD COLUMN IF NOT EXISTS is_certification_test BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cert_test_progress_user_completed 
ON public.certification_test_progress(user_id, is_completed);