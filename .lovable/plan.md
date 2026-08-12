# Turn on buyer emails and let existing documents be sent

Nothing is broken in the delivery logic — both channels are still behind the
development gate. `/admin/sales` shows "Not sent (dev)" for both because the
`BUYER_EMAILS_ENABLED` flag is off, so each channel only logged the document and
the address it would have used (`dominik@majkareinhardt.pl`) and marked the row
`skipped_gate`.

## 1. Open the gate

Set `BUYER_EMAILS_ENABLED` to `true`. From that moment every newly created
invoice and every correction discovered during Sync sends on both channels:
our own notification (link to /payments) and the FakturaXL email with the PDF
attached.

## 2. Send the documents that were created while gated

`skipped_gate` is deliberately not a settled state, so those rows are still owed
a send — but today nothing re-runs delivery for an existing row unless a new
document appears. Two changes:

- The per-row admin action currently only re-runs the notification, and is
  itself gated. It will instead run the full delivery pass for that row (both
  channels, respecting the per-channel settled states), so one click sends the
  notification and asks FakturaXL to email the PDF.
- The row-level Sync and the full Sync pass will run the same delivery pass for
  every row they touch, so documents skipped during development get picked up
  automatically instead of needing a click each.

Because the guards stay keyed on the invoice row, a document already `sent`,
`bounced`, `no_buyer_email` or `cap_reached` is never sent twice by these paths.

## 3. Verify with the real address

After the flag is on, trigger delivery for the existing document bought as
`dominik@majkareinhardt.pl` and report back: the recorded notification status
and the FakturaXL response code (23 = accepted, 22 = FakturaXL has no buyer
email on that document, 78 = cap, 63 = plan). `/admin/sales` will then show
real states instead of "Not sent (dev)".

## Technical notes

- Secret `BUYER_EMAILS_ENABLED=true`; no code path removed, so the gate can be
  closed again for testing.
- `supabase/functions/invoice-actions/index.ts`: the `resend` action calls
  `deliverInvoiceDocument` (with an explicit notification override so an admin
  resend still re-sends a `sent` notification); `sync_fxl` and the full sync
  pass call `deliverInvoiceDocument` per refreshed/imported row.
- No schema change; statuses continue to come from `notify_status` /
  `fxl_email_status` and the existing delivery log.
- Deploy `invoice-actions`, `stripe-webhook`, `reconcile-ksef` afterwards.
