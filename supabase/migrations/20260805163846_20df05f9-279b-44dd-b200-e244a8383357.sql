ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, terms_accepted_at, terms_version)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    CASE
      WHEN NEW.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL
        THEN (NEW.raw_user_meta_data->>'terms_accepted_at')::timestamptz
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'terms_version'
  );
  RETURN NEW;
END;
$function$;