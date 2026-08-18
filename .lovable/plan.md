# PLN pricing from an admin-set commercial rate (drop Adaptive Pricing)

## Confirmed facts first

**Settlement currency:** the Stripe account (Praktyka Lekarska Cezary Chudobiński) settles in **PLN** — the balance holds PLN only, available and pending. So PLN is a settlement currency and Stripe will never offer a PLN conversion on EUR prices. Your diagnosis is correct; Adaptive Pricing cannot work here.

**Current EUR prices (single course):**

| Course | Regular | Sale (until 20 Aug 2026) | Retake |
|---|---|---|---|
| LN-RADS Certification | €99 | €59 | €39 |

Example PLN at a few candidate rates (net, before VAT):

| Rate | €99 | €59 | €39 |
|---|---|---|---|
| 4.20 | 415.80 | 247.80 | 163.80 |
| 4.30 | 425.70 | 253.70 | 167.70 |
| 4.40 | 435.60 | 259.60 | 171.60 |

## Rounding options (you pick one in the admin screen)

- **Nearest 1 PLN** — 425.70 becomes 426. Neutral, closest to the true rate.
- **Nearest 10 PLN** — 425.70 becomes 430. Cleanest look, biggest drift from the rate.
- **.99 endings** — 425.70 becomes 429.99 (round up to the next .99). Most retail-looking; recommended for course pricing.

Rounding applies to the **net** amount; Stripe adds VAT on top.

## 1. Remove the Adaptive Pricing workarounds

- Delete the `+location_PL` test-email simulation from `create-checkout`.
- Delete the customer-currency-lock detach path and `customerCurrencyLock` from `_shared/stripe-customer.ts`; the saved Customer is always attached again.
- Stop sending `adaptive_pricing`; keep `automatic_tax`, `tax_id_collection`, hosted Checkout and billing sync untouched.
- Keep the webhook's `presentment_details` reading as a harmless fallback, but currency now comes from the session's own currency.

## 2. Admin-managed commercial rate (history, never overwritten)

New table `pricing_fx_rates` (append-only):
`id, eur_pln_commercial_rate numeric, rounding_mode text ('nearest_1' | 'nearest_10' | 'ends_99'), effective_from timestamptz, created_by uuid, created_at`.

- Admin-only RLS + grants; everyone authenticated (and anon, for public course pages) may read the **latest** row through a small read-only view or a security-definer function returning only rate + rounding.
- Field name is explicitly `eur_pln_commercial_rate` so it can never be mistaken for the NBP accounting rate. A code comment and an on-screen note state: **not used in invoicing or VAT conversion — those come from FakturaXL.**

New admin screen (card on `/admin/dashboard`, page `/admin/pricing`):
- current rate, when it changed, who changed it, plus the full history list;
- input for a new rate and rounding mode;
- a **live preview table** of every course's PLN price (regular, sale, retake) at the entered rate and rounding, shown before saving.

## 3. Derived PLN prices (never stored as truth)

- EUR stays authoritative in `courses`.
- A shared helper (`src/lib/plnPricing.ts` + `supabase/functions/_shared/pln-pricing.ts`) converts `eurNetCents → plnNetCents` using the current rate and rounding mode. One implementation of the rounding rules on each side, same semantics.
- Course page and pricing panel show PLN for Polish visitors (Polish site language or profile country PL), with the EUR price shown alongside as the reference price.

## 4. Buyer currency choice

- Explicit PLN / EUR toggle in the purchase UI (course page pricing panel and retake purchase), defaulting to **PLN** when the profile billing country is PL, otherwise EUR. Always changeable.
- The chosen currency is sent to `create-checkout` and validated server-side (`'eur' | 'pln'` only). The server recomputes the PLN amount from the current rate — the client never sends an amount.

## 5. Checkout session

- **EUR** path: unchanged, existing stored Stripe Price.
- **PLN** path: inline `price_data` (currency `pln`, unit_amount = derived net, product name = course title in the buyer's language, tax behaviour `exclusive`) — no stored PLN Price objects, so a rate change takes effect immediately.
- `automatic_tax`, `tax_id_collection`, attached Customer, discounts and the existing discount-stacking logic all apply identically; discounts are applied to the EUR net first, then converted, so percentages stay exact.
- **BLIK** enabled for PLN sessions only (payment method types include `blik` alongside card when currency is PLN).

## 6. Invoicing follows the payment currency

- The webhook already derives currency and amounts from the session; PLN sessions therefore produce PLN `invoices` rows.
- FakturaXL: PLN documents are sent as PLN with **no NBP exchange-rate note** (that block is only added for non-PLN documents); EUR documents keep today's behaviour including the note and `vat_amount_pln`.
- Refunds and corrections read the original invoice's currency and never re-derive it, avoiding FakturaXL `kod=41` mismatches.
- The admin commercial rate is used nowhere in invoice or VAT figures.

## 7. Audit trail

Add to `course_purchases` and `certification_retake_purchases`:
`currency`, `amount_paid_pln` (nullable), `fx_rate_id`, `eur_pln_commercial_rate_used`, `pln_rounding_mode`.
Written by the webhook at purchase time, so any sale can be reconciled later, and surfaced in `/admin/sales` and the user's `/payments` view.

## Verification

- One PLN test purchase: Checkout shows PLN with BLIK available, VAT added on top, invoice row and FakturaXL document in PLN with no NBP note.
- One EUR test purchase: unchanged behaviour, note present.
- A rate change immediately moves the displayed and charged PLN price without touching Stripe objects; the previous rate remains readable in history and on the older purchase row.
