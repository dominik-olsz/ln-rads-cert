CREATE TABLE public.lessons_backup_20260812 AS SELECT * FROM public.lessons;
ALTER TABLE public.lessons_backup_20260812 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lessons_backup_20260812 FROM anon, authenticated;
GRANT ALL ON public.lessons_backup_20260812 TO service_role;