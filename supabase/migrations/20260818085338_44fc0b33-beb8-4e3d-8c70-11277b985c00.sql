CREATE TABLE public.pricing_fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Commercial pricing rate set by an admin. NOT the NBP accounting rate:
  -- never use it for invoice or VAT figures (those come from FakturaXL).
  eur_pln_commercial_rate numeric(10,4) NOT NULL,
  rounding_mode text NOT NULL DEFAULT 'ends_99',
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pricing_fx_rates_rate_positive CHECK (eur_pln_commercial_rate > 0 AND eur_pln_commercial_rate < 100),
  CONSTRAINT pricing_fx_rates_rounding_mode_valid CHECK (rounding_mode IN ('nearest_1','nearest_10','ends_99'))
);

GRANT SELECT, INSERT ON public.pricing_fx_rates TO authenticated;
GRANT ALL ON public.pricing_fx_rates TO service_role;

ALTER TABLE public.pricing_fx_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rate history"
  ON public.pricing_fx_rates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can add a new rate"
  ON public.pricing_fx_rates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE INDEX pricing_fx_rates_effective_from_idx ON public.pricing_fx_rates (effective_from DESC);

-- Public read of only the current rate + rounding option (no author, no history).
CREATE OR REPLACE FUNCTION public.current_pricing_fx_rate()
RETURNS TABLE (eur_pln_commercial_rate numeric, rounding_mode text, effective_from timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.eur_pln_commercial_rate, r.rounding_mode, r.effective_from
  FROM public.pricing_fx_rates r
  ORDER BY r.effective_from DESC, r.created_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.current_pricing_fx_rate() TO anon, authenticated, service_role;

ALTER TABLE public.course_purchases
  ADD COLUMN currency text NOT NULL DEFAULT 'eur',
  ADD COLUMN amount_paid_pln integer,
  ADD COLUMN fx_rate_id uuid REFERENCES public.pricing_fx_rates(id),
  ADD COLUMN eur_pln_commercial_rate_used numeric(10,4),
  ADD COLUMN pln_rounding_mode text;

ALTER TABLE public.certification_retake_purchases
  ADD COLUMN currency text NOT NULL DEFAULT 'eur',
  ADD COLUMN amount_paid_pln integer,
  ADD COLUMN fx_rate_id uuid REFERENCES public.pricing_fx_rates(id),
  ADD COLUMN eur_pln_commercial_rate_used numeric(10,4),
  ADD COLUMN pln_rounding_mode text;