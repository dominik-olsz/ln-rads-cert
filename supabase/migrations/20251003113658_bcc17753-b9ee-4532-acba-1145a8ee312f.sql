-- Make course-materials bucket private for security
UPDATE storage.buckets 
SET public = false 
WHERE id = 'course-materials';

-- Remove the unused audit_logs table that has security issues
DROP TABLE IF EXISTS public.audit_logs CASCADE;