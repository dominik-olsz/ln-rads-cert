ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS notify_status text,
  ADD COLUMN IF NOT EXISTS notify_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS fxl_email_status text,
  ADD COLUMN IF NOT EXISTS fxl_email_code text,
  ADD COLUMN IF NOT EXISTS fxl_email_error text,
  ADD COLUMN IF NOT EXISTS fxl_email_sent_at timestamp with time zone;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_notify_status_check
  CHECK (notify_status IS NULL OR notify_status IN ('queued', 'skipped_gate', 'failed', 'no_email'));

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_fxl_email_status_check
  CHECK (fxl_email_status IS NULL OR fxl_email_status IN ('sent', 'skipped_gate', 'no_buyer_email', 'cap_reached', 'plan_required', 'failed'));