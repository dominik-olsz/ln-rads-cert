# Sales & invoices in the admin panel

A new **Sales** section in the admin panel listing every Stripe payment (courses and certification retakes), who bought it, and the invoice attached to it — with view, print/download PDF, and refund with an automatic correction invoice.

## Seller data used on every invoice

```text
Praktyka Lekarska Cezary Chudobiński
ul. Bursztynowa 2
95-050 Konstantynów Łódzki
NIP: 8291244164   REGON: 731020643
```

Stored as an editable setting so you can change the address later without a code change.

## Buyer data

Stripe Checkout collects the buyer's billing name, address and (optionally) VAT/NIP number. Those values are copied onto the invoice when the payment completes. Email comes from the account used to buy.

## VAT rules

- Buyer in Poland → 23% VAT. Invoice shows net, VAT 23%, gross.
- Buyer is an EU business outside Poland with a valid VAT ID → 0%, invoice carries the note "Reverse charge — VAT to be accounted for by the recipient (art. 28b ustawy o VAT)".
- Everyone else (EU consumers, non-EU) → 23% by default.

Your current prices (199 EUR course, 69 EUR retake) are treated as **gross** — VAT is calculated backwards from them, so the amount charged does not change.

## Invoices

- Generated automatically the moment Stripe confirms payment — no manual step.
- Numbering: `FV/{sequence}/{month}/{year}`, gapless per year, assigned by the database so two simultaneous payments can never share a number.
- Language: Polish/English bilingual labels, A4 PDF, stored so the same file can be re-downloaded at any time.
- Emailed to the buyer as a PDF attachment (using the existing email setup).

## Refunds and correction invoices

From the sales list, per sale:
- **Refund in full** or **partial amount** → executed against Stripe.
- A correction invoice (`FK/...`) is generated automatically referencing the original invoice, showing before/after amounts and the reason.
- Full refunds revoke access: course purchase removed, or an unused retake credit withdrawn. Partial refunds keep access.

## Admin screens

- `/admin/sales` — table: date, buyer (name, email, company/NIP), what was bought, gross amount, VAT, status (paid / partially refunded / refunded), invoice number. Search by buyer/email/invoice number, filter by status and date range, CSV export.
- Row detail drawer: full buyer and payment details, invoice preview, buttons **Download PDF**, **Print**, **Resend to buyer**, **Refund**.
- A **Sales** card added to the admin dashboard next to the existing ones.

## Technical notes

- New tables: `invoices` (number, type original/correction, buyer snapshot, line items, net/VAT/gross, currency, PDF path, links to purchase, refund parent) and `invoice_counters` for gapless numbering. Both admin-read-only via RLS; writes only from edge functions.
- `course_purchases` and `certification_retake_purchases` gain `stripe_payment_intent_id` plus refund fields so refunds can be issued and tracked.
- `stripe-webhook` extended: on `checkout.session.completed` it stores buyer/VAT data and generates the invoice; new handling for `charge.refunded` so refunds made directly in Stripe also produce a correction invoice.
- `create-checkout` updated to enable billing address collection and the tax-ID field, and to record the payment intent.
- New edge functions: `generate-invoice` (PDF build + storage upload + email), `refund-payment` (admin-only, validates amount, calls Stripe, triggers correction invoice, adjusts access).
- New private storage bucket `invoices`, admin/owner read via signed URLs.
- Seller details and VAT rate kept in `app_settings`, editable from an admin settings panel.

## Verify

Stripe test mode: buy a course as a PL consumer and as a DE company with VAT ID, confirm both invoices show correct VAT, then run a partial and a full refund and check the correction invoices and access changes.
