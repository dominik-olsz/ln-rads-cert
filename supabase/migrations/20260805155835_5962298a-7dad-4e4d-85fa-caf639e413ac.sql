-- Payment / refund tracking on purchases
ALTER TABLE public.course_purchases
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS refunded_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_email text,
  ADD COLUMN IF NOT EXISTS buyer_name text;

ALTER TABLE public.certification_retake_purchases
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS refunded_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_email text,
  ADD COLUMN IF NOT EXISTS buyer_name text;

-- Invoice numbering counters
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doc_type, year)
);

GRANT SELECT ON public.invoice_counters TO authenticated;
GRANT ALL ON public.invoice_counters TO service_role;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view invoice counters"
  ON public.invoice_counters FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  doc_type text NOT NULL DEFAULT 'FV',
  original_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  user_id uuid,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  purchase_type text NOT NULL DEFAULT 'course',
  course_purchase_id uuid REFERENCES public.course_purchases(id) ON DELETE SET NULL,
  retake_purchase_id uuid REFERENCES public.certification_retake_purchases(id) ON DELETE SET NULL,
  stripe_session_id text,
  stripe_payment_intent_id text,
  buyer_name text,
  buyer_company text,
  buyer_email text,
  buyer_address_line1 text,
  buyer_address_line2 text,
  buyer_postal_code text,
  buyer_city text,
  buyer_country text,
  buyer_vat_id text,
  seller jsonb NOT NULL DEFAULT '{}'::jsonb,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  currency text NOT NULL DEFAULT 'eur',
  vat_rate numeric NOT NULL DEFAULT 23,
  reverse_charge boolean NOT NULL DEFAULT false,
  net_amount integer NOT NULL DEFAULT 0,
  vat_amount integer NOT NULL DEFAULT 0,
  gross_amount integer NOT NULL DEFAULT 0,
  issued_at timestamptz NOT NULL DEFAULT now(),
  pdf_path text,
  refund_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS invoices_issued_at_idx ON public.invoices(issued_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_session_type_idx
  ON public.invoices(stripe_session_id, doc_type)
  WHERE stripe_session_id IS NOT NULL AND doc_type = 'FV';

GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_counters_updated_at
  BEFORE UPDATE ON public.invoice_counters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Gapless invoice numbering
CREATE OR REPLACE FUNCTION public.next_invoice_number(_doc_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year integer := EXTRACT(YEAR FROM now())::int;
  _month text := LPAD(EXTRACT(MONTH FROM now())::text, 2, '0');
  _seq integer;
BEGIN
  INSERT INTO public.invoice_counters (doc_type, year, last_number)
  VALUES (_doc_type, _year, 1)
  ON CONFLICT (doc_type, year)
  DO UPDATE SET last_number = public.invoice_counters.last_number + 1,
                updated_at = now()
  RETURNING last_number INTO _seq;

  RETURN _doc_type || '/' || _seq || '/' || _month || '/' || _year;
END;
$$;

REVOKE ALL ON FUNCTION public.next_invoice_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(text) TO service_role;
