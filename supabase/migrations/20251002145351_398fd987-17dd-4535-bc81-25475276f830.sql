-- Make course_id nullable for test_questions table to support certification questions
ALTER TABLE test_questions ALTER COLUMN course_id DROP NOT NULL;