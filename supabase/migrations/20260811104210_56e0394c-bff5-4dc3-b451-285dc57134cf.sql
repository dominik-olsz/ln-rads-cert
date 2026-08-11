ALTER TABLE public.invoices
  ADD COLUMN fxl_document_id text,
  ADD COLUMN fxl_unique_code text,
  ADD COLUMN ksef_status smallint,
  ADD COLUMN ksef_number text,
  ADD COLUMN ksef_assigned_at timestamptz,
  ADD COLUMN ksef_error_code text,
  ADD COLUMN ksef_error_desc text,
  ADD COLUMN ksef_attempts integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.invoices.ksef_status IS 'null = not submitted (not required for this buyer), 0 = sending, 1 = KSeF number assigned, 2 = send failed';

CREATE INDEX invoices_ksef_status_sending_idx ON public.invoices (ksef_status) WHERE ksef_status = 0;