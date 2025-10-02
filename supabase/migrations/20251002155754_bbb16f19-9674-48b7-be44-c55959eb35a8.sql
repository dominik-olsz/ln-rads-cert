-- Ensure certification_test_progress cleans up when test_attempts are deleted
DO $$
BEGIN
  -- Drop existing FK if present
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'certification_test_progress_test_attempt_id_fkey'
      AND tc.table_name = 'certification_test_progress'
  ) THEN
    ALTER TABLE public.certification_test_progress
      DROP CONSTRAINT certification_test_progress_test_attempt_id_fkey;
  END IF;
END $$;

-- Recreate foreign key with ON DELETE CASCADE
ALTER TABLE public.certification_test_progress
  ADD CONSTRAINT certification_test_progress_test_attempt_id_fkey
  FOREIGN KEY (test_attempt_id)
  REFERENCES public.test_attempts(id)
  ON DELETE CASCADE;