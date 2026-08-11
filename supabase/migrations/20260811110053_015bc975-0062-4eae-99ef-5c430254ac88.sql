CREATE OR REPLACE FUNCTION public.check_cron_secret_vault()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE _len int; _owner text;
BEGIN
  SELECT length(decrypted_secret) INTO _len FROM vault.decrypted_secrets WHERE name = 'cron_secret';
  SELECT current_user INTO _owner;
  RETURN jsonb_build_object('row_found', _len IS NOT NULL, 'secret_length', _len, 'read_as', _owner);
END;
$$;

REVOKE ALL ON FUNCTION public.check_cron_secret_vault() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_cron_secret_vault() TO service_role;