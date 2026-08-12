# Sync an invoice from FakturaXL

Add a "Sync" action to every invoice row in `/admin/sales` that pulls the latest version of the document from FakturaXL — plus its refund/correction document, if one exists — and replaces the stored copy everywhere in the system, including the buyer's My Payments page.

## What the button does

1. Re-reads the document from FakturaXL (number, gross, currency, NBP exchange rate, rate table, rate date, payment due date).
2. Updates the invoice record with those values, so the amounts shown in `/admin/sales` and `/payments` match FakturaXL exactly.
3. Downloads FakturaXL's current PDF and overwrites the stored file at the same path, so every existing link (admin view, print, buyer download) immediately serves the new version.
4. Repeats steps 1–3 for each linked correction document (FK) belonging to that invoice.
5. Shows a result toast: what was refreshed, and any value that changed (for example a new gross amount) or failed.

No new FakturaXL document is ever created, so invoice numbers can't be duplicated.

## Where it appears

- `/admin/sales`: a Sync icon button next to Download/Print in each row's action group, with a spinner while it runs.
- The buyer's `/payments` page needs no change — it downloads through a signed URL for the same storage path, so it picks up the refreshed PDF automatically.

## Technical details

- New `sync_fxl` action in `supabase/functions/invoice-actions/index.ts`, admin-only:
  - loads the invoice plus all rows where `original_invoice_id` = that invoice;
  - for each row with `fxl_document_id`: `readFakturaXLDocument()` then `fetchFakturaXLPdf()`, upload to the `invoices` bucket at the existing `pdf_path` with `upsert: true` (or the standard slug path when null);
  - writes back `invoice_number` (only if FakturaXL renumbered it), `gross_amount`, `currency`, `fxl_exchange_rate`, `fxl_nbp_table`, `fxl_rate_date`, `payment_due_date`, `vat_amount_pln` (recomputed from the rate), `fxl_status = 'synced'`, `pdf_path`;
  - rows without `fxl_document_id` are reported as "not in FakturaXL" instead of failing the whole run;
  - the existing 1.1 s throttle in `fetchFakturaXLPdf` keeps us inside FakturaXL's one-request-per-second limit; the correction is fetched after the invoice.
- `src/pages/admin/Sales.tsx`: `syncFromFakturaXL(invoice)` calling the new action, then `fetchInvoices()` to refresh the table.
- Existing `regenerate` action stays as-is (PDF-only retry).
