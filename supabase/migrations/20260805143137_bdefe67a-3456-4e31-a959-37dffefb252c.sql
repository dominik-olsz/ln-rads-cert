CREATE OR REPLACE FUNCTION public.update_course_test_questions_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.courses
    SET test_questions_count = (
      SELECT COUNT(*) FROM public.test_questions
      WHERE course_id = OLD.course_id AND lesson_id IS NULL AND test_type = 'course'
    )
    WHERE id = OLD.course_id;
    RETURN OLD;
  ELSE
    UPDATE public.courses
    SET test_questions_count = (
      SELECT COUNT(*) FROM public.test_questions
      WHERE course_id = NEW.course_id AND lesson_id IS NULL AND test_type = 'course'
    )
    WHERE id = NEW.course_id;
    RETURN NEW;
  END IF;
END;
$function$;

UPDATE public.courses c
SET test_questions_count = (
  SELECT COUNT(*) FROM public.test_questions q
  WHERE q.course_id = c.id AND q.lesson_id IS NULL AND q.test_type = 'course'
);