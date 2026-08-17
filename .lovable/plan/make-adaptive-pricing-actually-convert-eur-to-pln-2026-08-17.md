# Make Adaptive Pricing actually convert EUR to PLN

## What I verified first

Your Stripe checkout sessions already request Adaptive Pricing correctly. I pulled the last real sessions from your Stripe account:

- `adaptive_pricing: { enabled: true }` — present on every session
- `automatic_tax: enabled`, `managed_payments: disabled` — unchanged, VAT logic is fine
- `currency: "eur"`, **`currency_conversion: null`** — Stripe accepted the request but did not convert

So the code already asks for it; Stripe declined to convert. That means the cause is configuration/eligibility, not the missing parameter.

Also, the frontend part of your request does not apply to this project: we use **Stripe-hosted Checkout** (`ui_mode: "hosted_page"`), not embedded Elements. There is no `CheckoutElementsProvider`, `CurrencySelectorElement`, or `useCheckoutElements()` here — and per Stripe's docs, Adaptive Pricing is *not supported at all* with Elements + Payment Intents. Rebuilding checkout as Elements would mean re-doing VAT collection, tax IDs, billing address collection and the FakturaXL flow — high risk for zero gain. Hosted Checkout already shows a currency selector by itself once conversion is active.

## Step 1 — the one thing only you can do (Dashboard toggle)

Adaptive Pricing must be switched on per mode in the Stripe Dashboard; the API flag alone does nothing:

Stripe Dashboard → **Settings → Payments → Adaptive Pricing** → enable it in **sandbox/test** and again in **live** mode.

If it is already on there, Step 2 tells us exactly why Stripe still refuses.

## Step 2 — diagnostics so we stop guessing

Add temporary structured logging to `create-checkout` and `stripe-webhook`:

- after session creation, log `session.currency`, `session.adaptive_pricing`, `session.currency_conversion`, and the customer id used
- in the webhook, log `presentment_details` (`presentment_currency`, `presentment_amount`) from `checkout.session.completed`

Then one test purchase tells us which of the two remaining blockers it is:

- **Dashboard flag off** → session keeps `currency_conversion: null` with no other signal
- **Customer currency lock** → the reused Stripe Customer already has `currency: "eur"` from an earlier EUR payment, which pins presentment to EUR

## Step 3 — remove the customer currency lock (if that's the cause)

We reuse a saved Stripe Customer (`stripe_customer_id`) for prefill. Once a customer has paid in EUR, Stripe fixes their currency and Adaptive Pricing can no longer offer PLN to them.

Fix without losing prefill: keep sending the customer, but detect a locked `currency` that differs from the buyer's likely presentment currency and, in that case, create the session with `customer_email` + `customer_creation` instead of the pinned customer, so Stripe can pick the local currency. Billing data continues to sync as today.

## Step 4 — invoice in the currency the buyer actually paid

Today the webhook reads `session.currency` (always EUR, the settlement currency). Once conversion works, the buyer sees and pays PLN, so:

- read `presentment_details.presentment_currency` / `presentment_amount` when present and store that on the `invoices` row and purchase amount
- pass the same currency to FakturaXL, skipping the NBP exchange-rate fields for PLN documents (they only apply to non-PLN invoices)
- `/payments` and `/admin/sales` already read the stored currency — no change needed beyond correct data

Settlement bookkeeping (what Stripe pays out in EUR) stays untouched.

## Step 5 — price display

Site prices stay authored and displayed in EUR, with the existing note that Polish buyers can choose PLN at checkout. Converting on the page would need our own FX rates, which you did not want.

## What will not change

- No change to VAT handling (`automatic_tax` on, `managed_payments` off) — the 23% domestic PL fix stays exactly as is
- No change to discount/pricing logic, retake flow, or FakturaXL document numbering
- No rewrite of checkout to Elements

## Verification

One test-mode purchase from a Polish context, then confirm: the session shows a non-null `currency_conversion`, the webhook logs `presentment_currency: "pln"`, and the resulting invoice row plus FakturaXL document are in PLN.
