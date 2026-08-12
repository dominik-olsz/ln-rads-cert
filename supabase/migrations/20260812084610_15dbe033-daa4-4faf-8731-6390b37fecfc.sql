ALTER TABLE public.invoices
  ADD COLUMN settlement_status text,
  ADD COLUMN stripe_refund_id text,
  ADD COLUMN corrected_total_amount integer,
  ADD COLUMN refundable_amount integer,
  ADD COLUMN settled_at timestamp with time zone,
  ADD COLUMN settled_by uuid,
  ADD COLUMN stripe_refunded_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN discovered_from_fxl boolean NOT NULL DEFAULT false;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_settlement_status_check
  CHECK (settlement_status IS NULL OR settlement_status IN ('awaiting', 'stripe', 'manual'));

CREATE UNIQUE INDEX invoices_fxl_document_id_key
  ON public.invoices (fxl_document_id) WHERE fxl_document_id IS NOT NULL;

CREATE UNIQUE INDEX invoices_stripe_refund_id_key
  ON public.invoices (stripe_refund_id) WHERE stripe_refund_id IS NOT NULL;

UPDATE public.invoices
SET settlement_status = 'stripe',
    refundable_amount = abs(gross_amount),
    corrected_total_amount = 0,
    settled_at = COALESCE(settled_at, issued_at)
WHERE doc_type = 'FK';

UPDATE public.invoices fv
SET stripe_refunded_amount = COALESCE((
      SELECT sum(abs(fk.gross_amount))
      FROM public.invoices fk
      WHERE fk.original_invoice_id = fv.id AND fk.doc_type = 'FK'
    ), 0)
WHERE fv.doc_type = 'FV';