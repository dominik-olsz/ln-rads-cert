-- Make course_id nullable in certificates table for certification tests
ALTER TABLE public.certificates 
ALTER COLUMN course_id DROP NOT NULL;