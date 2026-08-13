DELETE FROM public.certification_test_progress p
WHERE p.is_completed = false
  AND EXISTS (
    SELECT 1 FROM public.test_attempts a
    WHERE a.user_id = p.user_id
      AND a.is_certification_test = true
      AND (p.course_id IS NULL OR a.course_id = p.course_id)
      AND a.completed_at >= p.started_at
  );