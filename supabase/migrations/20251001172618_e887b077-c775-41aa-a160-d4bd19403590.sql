-- Add hero_image column to courses table
ALTER TABLE public.courses
ADD COLUMN hero_image TEXT;

-- Add price and level columns to courses table for better course management
ALTER TABLE public.courses
ADD COLUMN price INTEGER DEFAULT 0,
ADD COLUMN level TEXT DEFAULT 'Beginner' CHECK (level IN ('Beginner', 'Intermediate', 'Advanced'));

-- Add explanation field to course_materials if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'course_materials' 
                 AND column_name = 'explanation') THEN
    ALTER TABLE public.course_materials ADD COLUMN explanation TEXT;
  END IF;
END $$;