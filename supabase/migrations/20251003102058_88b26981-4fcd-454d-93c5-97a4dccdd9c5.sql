-- Add test_questions_count column to courses table
ALTER TABLE public.courses
ADD COLUMN test_questions_count integer NOT NULL DEFAULT 0;

-- Function to update course test questions count
CREATE OR REPLACE FUNCTION public.update_course_test_questions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.courses
    SET test_questions_count = (
      SELECT COUNT(*)
      FROM public.test_questions
      WHERE course_id = OLD.course_id
      AND lesson_id IS NULL
    )
    WHERE id = OLD.course_id;
    RETURN OLD;
  ELSE
    UPDATE public.courses
    SET test_questions_count = (
      SELECT COUNT(*)
      FROM public.test_questions
      WHERE course_id = NEW.course_id
      AND lesson_id IS NULL
    )
    WHERE id = NEW.course_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to automatically update count when test questions change
CREATE TRIGGER update_course_test_questions_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.test_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_course_test_questions_count();

-- Initialize counts for existing courses
UPDATE public.courses
SET test_questions_count = (
  SELECT COUNT(*)
  FROM public.test_questions
  WHERE test_questions.course_id = courses.id
  AND test_questions.lesson_id IS NULL
);