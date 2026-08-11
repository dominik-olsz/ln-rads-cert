ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS fxl_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fxl_exchange_rate numeric,
  ADD COLUMN IF NOT EXISTS fxl_nbp_table text,
  ADD COLUMN IF NOT EXISTS fxl_rate_date date,
  ADD COLUMN IF NOT EXISTS vat_amount_pln integer,
  ADD COLUMN IF NOT EXISTS payment_due_date date;

UPDATE public.invoices SET fxl_status = 'synced' WHERE fxl_document_id IS NOT NULL AND fxl_status = 'pending';