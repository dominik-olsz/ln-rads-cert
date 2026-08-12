# Two delivery channels per document, with visible status

Every invoice (FV) and every correction (FK) gets two independent notifications:
our own Resend notification (a short "your document is available" email linking
to /payments) and FakturaXL's own email with the PDF attached. Both are tracked
separately on the invoice row, shown in /admin/sales, sent at most once per
document, and gated off until go-live.

## 1. Dev gate: BUYER_EMAILS_ENABLED

A new secret `BUYER_EMAILS_ENABLED` (default off) wraps both sends. When off,
nothing leaves the system: each channel logs the document number, the channel
and the exact recipient address that would have been used, and the row is marked
as skipped-by-gate (not as sent), so flipping the flag later still allows a
first real send. Admin alerts and auth emails are untouched.

## 2. Resend notification, corrections included

The existing `invoice-issued` template keeps its plain, document-style markup,
queue, retry and suppression handling. It gains correction wording: when the
document is an FK it states that a correction was issued, names both documents
("FK EDU/2/08/2026 correcting FV EDU/2/08/2026"), shows the corrected total
alongside the refunded amount, and links to /payments where both PDFs are
downloadable. Wording stays "a document is available" — never "attached" —
since the PDF itself arrives from FakturaXL.

Discovered corrections trigger this notification once, right after their PDF is
stored during Sync.

## 3. FakturaXL email

After a document exists in FakturaXL and its PDF is stored, call
`wyslanie_faktury_do_klienta_emailem.php` with `api_token`, `dokument_id` and
`<zalacz_dokument_w_formacie_pdf>1</zalacz_dokument_w_formacie_pdf>`, respecting
the 1 request/second limit (same throttle already used for PDF downloads).

Response codes are interpreted, not lumped together:

- `kod=23` — accepted; recorded as sent.
- `kod=22` — the FakturaXL document has no buyer email; recorded as a permanent
  failure with a clear reason and surfaced in /admin/sales, because that
  document will never reach the buyer.
- `kod=78` — the 50-emails-per-document cap was hit; recorded as capped, not
  retried.
- `kod=63` — API email requires the paid plan; recorded as a configuration
  error and raised through the existing admin delivery alert.
- anything else / transport errors — recorded as failed with the code and
  message, retryable.

This runs for invoices created by our pipeline and for corrections imported from
FakturaXL during Sync (those are created in the panel, so the
`wyslij_dokument_do_klienta_emailem` flag on `dokument_dodaj` does not apply).

## 4. Idempotency

Both channels key on the invoice row, not on the attempt:

- The Resend notification is only enqueued when the row has no notification
  state yet; the idempotency key stays derived from the invoice id.
- The FakturaXL email is only called when the row has no FakturaXL-email state
  yet. Repeated Sync passes, PDF re-downloads and row-level syncs never resend.
- Admin "Resend" in /admin/sales stays an explicit, deliberate override.

## 5. /admin/sales

Each sale and correction row shows two small status indicators side by side:

```text
Notification: Sent / Sending / Bounced / Spam / Blocked / Failed / Not sent (dev)
FakturaXL email: Sent / No buyer email / Cap reached / Plan error / Failed / Not sent (dev)
```

The notification state continues to come from the existing delivery log (so
bounce and complaint feedback still flows in), while the FakturaXL state comes
from the new columns. The detail sheet spells out the recorded reason for any
failure.

## Technical notes

- Migration adds to `public.invoices`: `notify_status` text,
  `notify_sent_at` timestamptz, `fxl_email_status` text,
  `fxl_email_code` text, `fxl_email_error` text, `fxl_email_sent_at`
  timestamptz. Statuses are constrained to known values; existing rows stay
  null (never sent). No new table, no grant changes.
- `supabase/functions/_shared/fakturaxl.ts`: add `FXL_ENDPOINTS.sendByEmail`,
  new error codes 22/23/78 to `FXL_ERRORS`, and
  `sendFakturaXLDocumentByEmail(documentId)` returning the parsed code, using
  the existing 1.1 s throttle helper.
- `supabase/functions/_shared/invoice.ts`: a single
  `deliverInvoiceDocument(admin, row)` helper runs both channels behind the gate
  with the row-keyed guards, called at the end of `finalizeInvoice` and reused
  elsewhere. `sendInvoiceEmail` records `notify_status`.
- `supabase/functions/invoice-actions/index.ts`: `importCorrection` calls
  `deliverInvoiceDocument` after the correction PDF is uploaded; row-level and
  full Sync passes never resend because of the row guards.
- `src/pages/admin/Sales.tsx`: table cell and detail sheet render both channel
  states from the existing delivery map plus the new columns.
- Deploy `send-transactional-email`, `invoice-actions`, `stripe-webhook`,
  `reconcile-ksef` after the change.
