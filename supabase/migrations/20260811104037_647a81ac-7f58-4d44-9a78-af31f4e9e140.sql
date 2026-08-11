CREATE OR REPLACE FUNCTION public.next_invoice_number(_doc_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _year integer := EXTRACT(YEAR FROM now())::int;
  _month text := LPAD(EXTRACT(MONTH FROM now())::text, 2, '0');
  _seq integer;
  _prefix text;
BEGIN
  INSERT INTO public.invoice_counters (doc_type, year, last_number)
  VALUES (_doc_type, _year, 1)
  ON CONFLICT (doc_type, year)
  DO UPDATE SET last_number = public.invoice_counters.last_number + 1,
                updated_at = now()
  RETURNING last_number INTO _seq;

  _prefix := CASE _doc_type
    WHEN 'FV' THEN 'FV EDU'
    WHEN 'FK' THEN 'FK EDU'
    ELSE _doc_type
  END;

  RETURN _prefix || '/' || _seq || '/' || _month || '/' || _year;
END;
$function$;