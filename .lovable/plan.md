# Fix VAT, checkout prefill, and invoice delivery

Three issues from the `dominik_olszewski@o2.pl` purchase. One is confirmed from logs and data, one needs a small change plus verification, one has a platform constraint you should know about.

## 1. VAT is missing at checkout (confirmed)

Today the course price is sent to Stripe as the **final** amount, and the invoice then extracts VAT backwards. Invoice `FV EDU/6/08/2026` shows exactly that: 48.00 gross = 39.02 net + 8.98 VAT.

Change to net-first pricing with Stripe Tax:

- Prices in the admin panel become **net**. A 48 EUR course charges a Polish buyer 59.04 EUR (48 + 23% VAT).
- Stripe Checkout gets `automatic_tax` enabled and each line item marked as tax-exclusive, so Stripe adds the right rate per buyer country and applies EU reverse charge when a valid business VAT ID is present.
- The invoice stops guessing: net, VAT amount and gross are taken from what Stripe actually charged, so the invoice always matches the payment to the cent.
- Applies to both course purchases and paid certification retakes.
- The prices you already entered stay as they are — they are simply now treated as net, so displayed and charged totals go up by the VAT rate.

**Requires from you:** Stripe Tax must be turned on in your Stripe account (Stripe dashboard → Tax), with the origin address and a Poland registration. Until that is done, checkout would fail, so this part goes live only once Tax is active. I will surface a clear error instead of a broken checkout if it is not.

## 2. Account details not carried into Checkout

Your saved billing details are pushed to your Stripe customer record, and the invoice for this purchase did end up with the correct company name, address and NIP — so the sync itself is working. What Stripe Checkout cannot pre-fill is the **tax ID field**: Stripe never pre-populates it, which is most likely what you saw as "my data was not taken".

Changes:

- Re-push the saved billing profile to Stripe immediately before the Checkout session is created, so a detail saved seconds earlier is always in place.
- Show the buyer's saved company, address and VAT ID as read-only line items in the Checkout summary, so it is visible that the invoice data is already known.
- Keep the tax ID field available for buyers who have not saved one; when we already have a VAT ID, the saved value is used for the invoice regardless of what Checkout collects.
- Verify end-to-end afterwards with a real test checkout and report what Checkout displays.

## 3. Invoice email never arrived (confirmed cause)

The webhook log for this purchase shows:

```text
Resend error: 403 — The lnrads.com domain is not verified
```

Invoices are being emailed through Resend on an unverified domain, so every invoice email is rejected. Your verified Lovable sending domain (`notify.mail.lnrads.com`) is the one that actually works, and the auth emails already use it.

Changes:

- Move invoice emails onto your own verified email infrastructure, off Resend.
- Branded invoice email containing a **download link** that opens the invoice in *My payments* after sign-in (secure, no public file exposure).
- **Constraint on the attachment:** file attachments are not supported by the built-in email system. So the email will be link-only rather than link + PDF. If you want the PDF physically attached, that needs a verified third-party provider on a separate subdomain — tell me and I will plan that separately.
- Correction invoices (FK) and the admin "resend" action use the same path.
- Failed invoice emails are retried automatically, and admin sales shows if delivery failed.

## Existing invoice for this purchase

`FV EDU/6/08/2026` was issued with 48.00 as gross. Once the VAT change is live, I can issue a correction invoice (FK) for it and re-charge or refund the difference — say the word and I will do that as a follow-up.

## Technical notes

- `create-checkout`: `automatic_tax: { enabled: true }`, `price_data.tax_behavior: "exclusive"`, `customer_update: { address: "auto", name: "auto" }` (required by automatic tax), plus `custom_text` for the saved billing summary.
- `stripe-webhook`: use `session.amount_subtotal`, `session.total_details.amount_tax` and `amount_total`; pass these into `createInvoice` instead of deriving VAT with `computeAmounts`. `computeAmounts` stays as the fallback for the free/manual-grant and refund paths.
- `_shared/invoice.ts`: `sendInvoiceEmail` switches from the Resend REST call to invoking the project's transactional send function with a signed-link template; `invoice-actions` resend keeps working unchanged.
- Scaffold app email infrastructure and an `invoice-issued` template, add the unsubscribe page at the assigned path, then deploy `create-checkout`, `stripe-webhook`, `invoice-actions` and the email functions.
- `/payments` gains a deep link (`/payments?invoice=<id>`) so the emailed link lands on the right row and triggers the existing signed-URL download.
