CREATE POLICY "Anyone can read the pricing rate"
  ON public.pricing_fx_rates FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON public.pricing_fx_rates TO anon;

CREATE OR REPLACE FUNCTION public.current_pricing_fx_rate()
RETURNS TABLE (eur_pln_commercial_rate numeric, rounding_mode text, effective_from timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT r.eur_pln_commercial_rate, r.rounding_mode, r.effective_from
  FROM public.pricing_fx_rates r
  ORDER BY r.effective_from DESC, r.created_at DESC
  LIMIT 1
$$;