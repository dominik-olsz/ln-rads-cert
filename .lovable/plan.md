# Make "Check FakturaXL sync" a real repair pass

Today the button only *reports* differences for the current month. It becomes a full one-click reconciliation over the date range selected on the page, with FakturaXL as the single source of truth. Nothing is ever created, changed or deleted in FakturaXL — every write happens only on this website.

## What the button will do

For every FV EDU/… and FK EDU/… document in the selected From–To range:

1. Read the document from FakturaXL (number, gross, currency, NBP rate, rate table, rate date, payment due date).
2. If any stored value differs, overwrite it here so the website matches FakturaXL exactly.
3. Re-download FakturaXL's PDF and replace the stored file at the same path, so admin view, print and the buyer's My Payments immediately serve the current version.
4. If the document no longer exists in FakturaXL — or was never created there — the invoice row and its stored PDF are deleted from the website (it disappears from /admin/sales and from the buyer's My Payments too). Correction documents are deleted before their parent invoice so nothing is left dangling.
5. FakturaXL documents in the range that have no counterpart here are listed as "in FakturaXL only" — those are reported, not imported, since we have no purchase to attach them to.

The run finishes with a summary dialog in four groups: updated (with the exact values that changed), unchanged, deleted, and in FakturaXL only.

## Safety

- Only read endpoints are called against FakturaXL (`dokument_odczytaj`, `pdf_p`, document list). No document is created, edited or cancelled there.
- Deletion is confirmed once before the run starts, with a count of how many rows will be removed.
- FakturaXL allows one request per second, so the run paces itself; expect roughly one second per document.

## Technical notes

- `supabase/functions/invoice-actions/index.ts`: replace the report-only `fxl_orphans` branch with `fxl_sync_all`, admin-only, accepting `from`/`to`:
  - loads all `invoices` rows with `issued_at` inside the range (no 20-row cap), corrections first;
  - per row with `fxl_document_id`: `readFakturaXLDocument()`; on a document that reads back as missing, delete the storage object at `pdf_path` from the `invoices` bucket and the row; otherwise patch `invoice_number`, `gross_amount`, `currency`, `fxl_exchange_rate`, `fxl_nbp_table`, `fxl_rate_date`, `payment_due_date`, `vat_amount_pln`, `fxl_status = 'synced'` and re-upload `fetchFakturaXLPdf()` with `upsert: true`;
  - rows with `fxl_document_id = null` are deleted (never pushed, so nothing to match);
  - keeps the existing `dokument_lista` pass to report FakturaXL-only documents;
  - reuses the same per-row logic as the existing single-row `sync_fxl` action so both paths stay identical.
- `src/pages/admin/Sales.tsx`: send the page's `from`/`to` with the call, add a confirm step, and render the four result groups in the existing dialog; refresh the table afterwards.
- No schema change needed.
