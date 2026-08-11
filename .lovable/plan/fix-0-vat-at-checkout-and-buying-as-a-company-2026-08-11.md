# Fix 0% VAT at checkout and buying as a company

## Diagnostics (done, read-only)

**1. Tax registration exists — but with the wrong scheme.** `GET /v1/tax/registrations` (test key) now returns one registration, so it is no longer empty:

```text
taxreg_1U3JKU42JAD4kmEH8cOhhn8Q  country=PL  status=active  active_from=2026-08-11
country_options.pl = { type: "standard", standard: { place_of_supply_scheme: "small_seller" } }
```

`place_of_supply_scheme: "small_seller"` is the EU small-business (SME) exemption scheme. Under it Stripe does not charge destination VAT on the sale, which is exactly the "no tax shown" behaviour you see, and it is also why a Polish buyer with a Polish VAT ID came back as `tax_exempt: "reverse"`. A normal Polish VAT-registered seller must be registered with `place_of_supply_scheme: "standard"`.

**2. Account tax defaults are fine.** `GET /v1/tax/settings`: `status: active`, `defaults.tax_behavior: "exclusive"`, head office set.

**3. Tax code on the line item.** The course is not sold via a stored Price — `create-checkout` builds `price_data` inline with `product_data.tax_code: "txcd_10103001"` (digital education / online course) and `tax_behavior: "exclusive"`. That part is already correct; the account default tax code (`txcd_10000000`) is not used.

**4. Why "buy as a company" is missing.** Before creating the session, `syncStripeCustomer` writes your saved NIP onto the Stripe Customer as a tax ID. Stripe Checkout hides the "I'm purchasing as a business" / tax-ID field when the attached Customer already has one, so there is no company option in the UI. For buyers with nothing saved the field exists but is easy to miss, and there is no way to enter company name + NIP anywhere before Stripe.

## What you need to change in Stripe (I cannot pick the scheme for you)

Stripe Dashboard, test mode: **Tax → Registrations → Poland**. Either edit the Poland registration or expire it and add it again, choosing the plain **standard domestic registration**, not the small-business / SME (`small_seller`) option. Then tell me and I will verify.

## What I will do

### 1. Verify with a real test session
Create a test Checkout Session for the €48 net course as a Polish buyer with a Polish VAT ID and report `amount_subtotal`, `total_details.amount_tax`, `amount_total` and `customer_details.tax_exempt`. Target: `4800 / 1104 / 5904` and `tax_exempt` not `reverse`. If it still shows 0%, I will report the tax calculation status/reason from the session rather than guessing.

### 2. Make "buying as a company" explicit on our side
Instead of relying on Stripe's hidden tax-ID field, collect the buyer type before checkout:

- On the course purchase action, open a short billing step: **Private person / Company**, and for Company: company name, NIP, address, country. Pre-filled from the saved account billing details, saved back to the profile on continue.
- That data is pushed to the Stripe Customer immediately before the session is created, so the invoice and the tax calculation both use it.
- Keep Stripe's own tax-ID collection enabled as a fallback for buyers who skip it, and let a buyer who has a saved VAT ID still switch to a private purchase (which then removes the tax ID for that sale, so domestic VAT is charged normally).

### 3. Guard against silently selling at 0% VAT again
If Stripe returns `amount_tax = 0` for a buyer in a country where we hold a registration, log a warning on the webhook and surface it in admin Sales, so a mis-scoped registration is visible instead of quietly producing 0% invoices.

## Technical notes

- `create-checkout`: keep `automatic_tax: { enabled: true }`, `tax_behavior: "exclusive"`, `customer_update: { address: "auto", name: "auto" }`; change `tax_id_collection` to `{ enabled: true, required: "if_supported" }`.
- `_shared/stripe-customer.ts`: only attach the EU VAT tax ID when the buyer chose Company for this purchase; delete the stored tax ID when they buy as a private person, so Checkout renders the business option and the sale is standard-rated.
- New pre-checkout billing dialog reusing the field set and country list already used by `/account` (`src/lib/countries.ts`), writing to `profiles` and then invoking `sync-billing`.
- Invoice VAT continues to come from `session.amount_subtotal` / `total_details.amount_tax` / `amount_total`, so invoices match the charge to the cent.
- No changes to existing invoices; the two domestic 0% invoices already flagged stay untouched pending your accountant.
