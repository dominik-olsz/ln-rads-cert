-- Lesson body columns (content_text, content_url) must not be readable through the
-- Data API. Column privileges are ADDITIVE with table privileges, so the table-wide
-- SELECT is revoked first and an explicit column list is re-granted.
--
-- MAINTENANCE NOTE: any column added to public.lessons in the future MUST also be
-- added to the GRANT SELECT column list below, otherwise it will silently be
-- unreadable from the frontend (PostgREST will error on selecting it).
REVOKE SELECT ON TABLE public.lessons FROM anon, authenticated;

GRANT SELECT (id, course_id, title, content_type, order_index, duration, created_at, is_free)
  ON public.lessons TO anon, authenticated;

COMMENT ON TABLE public.lessons IS
  'Lesson outline is publicly readable; content_text and content_url are NOT selectable by anon/authenticated (served only by the get-lesson-content edge function via service role). When adding a column, extend the GRANT SELECT (...) column list for anon and authenticated.';