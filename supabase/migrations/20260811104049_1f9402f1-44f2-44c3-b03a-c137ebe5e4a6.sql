REVOKE ALL ON FUNCTION public.next_invoice_number(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(text) TO service_role;