CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE OR REPLACE FUNCTION public.set_cron_secret(_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM vault.secrets WHERE name = 'cron_secret';
  IF _id IS NULL THEN
    PERFORM vault.create_secret(_value, 'cron_secret', 'Bearer token for scheduled reconcile-ksef invocations');
  ELSE
    PERFORM vault.update_secret(_id, _value, 'cron_secret', 'Bearer token for scheduled reconcile-ksef invocations');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_cron_secret(text) TO service_role;