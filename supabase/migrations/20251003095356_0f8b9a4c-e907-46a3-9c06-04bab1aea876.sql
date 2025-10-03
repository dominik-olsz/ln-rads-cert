-- Add grants_certification_access column to courses table
ALTER TABLE public.courses 
ADD COLUMN grants_certification_access boolean NOT NULL DEFAULT false;

-- Add a helpful comment
COMMENT ON COLUMN public.courses.grants_certification_access IS 'When true, purchasing this course grants access to the Certification Test';