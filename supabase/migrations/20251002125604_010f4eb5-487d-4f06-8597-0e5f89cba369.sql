-- Add order_index column to test_questions table
ALTER TABLE test_questions 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_test_questions_order 
ON test_questions(course_id, order_index);