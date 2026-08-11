# FakturaXL-first invoicing, billing sync, and a customer payments page

Overriding rule for all five items: the FakturaXL document is created first and our PDF is a faithful copy of it. The invoice number still comes from `next_invoice_number` and is sent to FakturaXL explicitly; everything else on the PDF (exchange rate, NBP table, VAT in PLN, due date) is read back from the created document.

## 4. Restructured createInvoice() (done first — everything else depends on it)

New sequence in `supabase/functions/_shared/invoice.ts`:

```text
1. next_invoice_number(doc_type)            -> invoice number
2. insert invoices row                       (fxl_status = 'pending', no pdf_path)
3. pushInvoiceToFakturaXL(row)               (creates the document with that number)
4. dokument_odczytaj on the new document      -> kurs, nr_tabeli_nbp, data_kursu,
                                                termin_platnosci, gross check
5. store fxl_exchange_rate, fxl_nbp_table, fxl_rate_date,
   vat_amount_pln, payment_due_date, fxl_status = 'synced'
6. renderInvoicePdf() from the stored values
7. upload the PDF to the invoices bucket, set pdf_path
8. sendInvoiceEmail() with the attachment
```

If step 3 or 4 fails: the row stays `fxl_status = 'pending'` with the error recorded, **no PDF is rendered and no email is sent**. `/admin/sales` shows it as pending, and the reconciler retries; on the first successful retry it continues from step 4 through step 8, so the customer gets the compliant invoice a few minutes later.

Added to the PDF:
- `Termin płatności / Payment due date: YYYY-MM-DD`
- notes block, exactly:

```text
Kurs waluty EUR/PLN 4.3037, tabela kursów średnich NBP nr 153/A/NBP/2026 z dnia 2026-08-10
Przeliczona kwota VAT: 59,39 PLN
```

The rate note is omitted only when the invoice currency is PLN (nothing to convert). VAT in PLN is taken from the rate FakturaXL resolved — we never compute a rate ourselves.

## 1. Two-way sync of invoice details

Outbound (`create-checkout`): reuse `profiles.stripe_customer_id` (new column) instead of looking the customer up by email each time; create it once and store it. Update name/address on the Customer, attach the tax ID via the tax-IDs API, and pass `customer` (never `customer_email`) so Stripe Checkout shows the VAT ID prefilled. `tax_id_collection` stays enabled so the buyer can still change it.

Inbound (`stripe-webhook`): always write the completed session's billing details back to `profiles` — the current "only when address_line1 is empty" guard is removed, since the buyer's latest entry is the most current.

`buyer_type` becomes derived and consistent in both directions: a VAT ID present means `company`, absent means `private`; the same rule is applied in `/account` when saving.

## 2. "My payments" page

New route `/payments` (linked from the navbar dropdown and `/dashboard`), listing course purchases and certification retakes: date, description, amount, invoice number, and a download button for the invoice PDF plus the correction invoice where one exists.

Downloads go through the existing `invoice-actions` function with a new `signed_url` action: it verifies the caller owns the invoice (`user_id = auth.uid()`), then returns a short-lived signed URL for `pdf_path`. The bucket stays private and `pdf_path` is never exposed to the client. Rows whose invoice is still pending show "Invoice is being issued" instead of a download.

## 3. Verify the invoice email end to end

No rebuild — `sendInvoiceEmail` with the fixed chunked base64 stays as is. Verification runs as part of the two test checkouts (private person and company): confirm the email arrives, the attachment size matches the uploaded object, and the PDF opens and carries the rate note and due date.

## 5. Two-way sync check

The `fxl_orphans` action is extended to compare content, not just presence:
- every `invoices` row in the period must have an `fxl_document_id` (rows without one are reported as unsynced);
- for each row, the FakturaXL document's `numer_faktury` **and gross amount** must match exactly — differences are reported per row;
- every FakturaXL document in the period must map to an `invoices` row;
- corrections (`FK`) are checked the same way.

`/admin/sales` shows the result as three groups: unsynced rows, mismatches, and FakturaXL-only documents.

## Technical notes

- Migration: `profiles.stripe_customer_id`; `invoices` gains `fxl_status` ('pending' | 'synced' | 'failed'), `fxl_exchange_rate` numeric, `fxl_nbp_table` text, `fxl_rate_date` date, `vat_amount_pln` integer, `payment_due_date` date. No policy changes needed — invoices stay admin-write-only with the existing owner read policy.
- `pushInvoiceToFakturaXL` returns the created document id so `createInvoice` can read it back; a new `readFakturaXLDocument()` helper in `_shared/fakturaxl.ts` parses `kurs`, `nr_tabeli_nbp`, `data_kursu`, `termin_platnosci_data` and gross.
- `reconcile-ksef` gains a "finish pending invoices" pass: for rows with `fxl_status = 'pending'`, retry the push/read and then render, upload and email.
- `renderInvoicePdf` takes the new fields; `invoice-actions` regenerate path uses the same stored values so a regenerated PDF is identical.
- Frontend: new `src/pages/Payments.tsx` + route in `src/App.tsx`, links in `Navbar.tsx` and `Dashboard.tsx`; `Account.tsx` buyer-type/VAT consistency rule.

## Verify

Two Stripe test checkouts — private person without a VAT ID, and a Polish company with a valid NIP — checking for each: webhook ran, FakturaXL `dokument_dodaj` response, the rate note and due date on the PDF, the email with a working attachment, the row visible in `/admin/sales` and `/payments`, and the sync check reporting zero mismatches.
