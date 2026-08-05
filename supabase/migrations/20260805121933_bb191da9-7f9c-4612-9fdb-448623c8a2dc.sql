ALTER TABLE public.certification_retake_purchases ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public.certification_test_progress ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;

UPDATE public.certification_retake_purchases SET course_id = 'e946f917-2e54-4bec-8b5c-43c1fb182177' WHERE course_id IS NULL;
UPDATE public.certification_test_progress SET course_id = 'e946f917-2e54-4bec-8b5c-43c1fb182177' WHERE course_id IS NULL;