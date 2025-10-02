-- Add test_type column to test_questions table
ALTER TABLE public.test_questions 
ADD COLUMN test_type text NOT NULL DEFAULT 'certification' 
CHECK (test_type IN ('course', 'certification'));

-- Create index for better query performance
CREATE INDEX idx_test_questions_test_type ON public.test_questions(test_type);

COMMENT ON COLUMN public.test_questions.test_type IS 'Type of test: course (part of course content) or certification (final exam)';