# Payments & invoicing — mode switching checklist

## The two secrets that must ALWAYS match mode

| Secret | Test mode value | Live mode value | Used by |
| --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…` / `rk_test_…` | `sk_live_…` / `rk_live_…` | `create-checkout`, `stripe-webhook`, `refund-payment` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the **test-mode** endpoint | `whsec_…` from the **live-mode** endpoint | `stripe-webhook` only |

**They must be changed together, in the same sitting.** Stripe issues a *separate*
signing secret per endpoint per mode. A mismatch fails closed and silently:

- Live key + test signing secret → Checkout succeeds, the customer is charged,
  Stripe POSTs the event, `constructEventAsync` throws
  `No signatures found matching the expected signature`, the function returns
  **400**, and nothing downstream runs: no `course_purchases` row, no course
  access, no `invoices` row, no invoice number from `next_invoice_number`,
  no FakturaXL document, no KSeF submission, no invoice email.
- Test key + live signing secret → same failure, in reverse.

This exact mismatch is why the purchase → invoice → FakturaXL chain had never
executed: `STRIPE_WEBHOOK_SECRET` was absent, so `stripe-webhook` returned 500
before verification and was never invoked successfully.

## Switch procedure (test → live, or live → test)

1. In Stripe, toggle to the target mode.
2. Developers → Webhooks → add (or open) an endpoint for that mode:
   - URL: the project's `stripe-webhook` function URL
   - Events: `checkout.session.completed`, `charge.refunded`
3. Copy that endpoint's `whsec_…`.
4. Update **both** secrets in Lovable Cloud in one go:
   `STRIPE_SECRET_KEY` (target-mode key) and `STRIPE_WEBHOOK_SECRET`
   (the `whsec_` from step 3).
5. Verify before trusting it: run one checkout, then confirm
   - `stripe-webhook` logs show an invocation with **no** signature error,
   - a new `course_purchases` row exists,
   - a new `invoices` row exists with a number from `next_invoice_number`
     (`FV EDU/<n>/<MM>/<YYYY>`), visible in `/admin/sales`.

## Mode indicators (how to tell what you're on)

- Key prefix: `sk_test_`/`rk_test_` vs `sk_live_`/`rk_live_`.
- Checkout session id: `cs_test_…` vs `cs_live_…`.
- Any Stripe API object has `"livemode": true|false`.

## Not mode-specific (do NOT rotate when switching Stripe modes)

`FAKTURAXL_API_TOKEN`, `RESEND_API_KEY`, `CRON_SECRET` (+ its `cron_secret`
vault copy), `LOVABLE_API_KEY`, and all `SUPABASE_*` values are mode-agnostic.

⚠️ FakturaXL has **no sandbox**. Every successful checkout — test-mode Stripe
included — issues a real document in the FakturaXL account via
`dokument_dodaj.php`. Test purchases therefore produce real Polish invoice
numbers that must be corrected/removed manually. KSeF submission stays inert
only while FakturaXL returns `kod=52` (KSeF not configured).
