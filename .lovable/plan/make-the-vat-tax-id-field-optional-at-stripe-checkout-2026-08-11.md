# Make the VAT / tax ID field optional at Stripe Checkout

## Problem

Stripe Checkout currently forces every buyer to enter a business tax ID, so a private person cannot complete a purchase without VAT data.

Cause: both Checkout Sessions in `create-checkout` are created with
`tax_id_collection: { enabled: true, required: "if_supported" }`. The
`required: "if_supported"` flag makes the field mandatory for buyers in
countries Stripe supports — including Poland.

## Change

- Course checkout and paid certification-retake checkout both switch to
  `tax_id_collection: { enabled: true }` — the field stays visible so a buyer
  can still add a VAT number, but it is no longer mandatory.
- Nothing else changes: private buyers stay standard-rated (23% VAT for a
  Polish buyer), company buyers who saved a VAT ID in the pre-checkout invoice
  details step keep it attached, and the invoice still uses the saved billing
  profile as the source of the NIP.

## Technical notes

- File: `supabase/functions/create-checkout/index.ts`, two occurrences
  (retake session ~line 195, course session ~line 303).
- Redeploy `create-checkout`.
- Verify with a test checkout as a private person: Checkout completes without a
  tax ID, and the session still reports 4800 net / 1104 tax / 5904 total with
  `tax_exempt: none`.
