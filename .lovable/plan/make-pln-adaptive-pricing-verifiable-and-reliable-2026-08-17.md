# Make PLN Adaptive Pricing verifiable and reliable

## Verified diagnosis

The latest test Checkout Session is Stripe-hosted and contains:

- `adaptive_pricing.enabled: true`
- base price and tax in EUR
- `ui_mode: hosted_page`
- `currency_conversion: null`
- a reused Customer whose `currency` is `null`

This rules out a missing Adaptive Pricing parameter and a customer currency lock for this session. Stripe did not identify the test Checkout as a Polish customer. Stripe’s documented test procedure requires a location-formatted email such as `name+location_PL@example.com`; normal test traffic does not reliably inherit the browser’s real location.

## Implementation

1. **Keep Stripe-hosted Checkout**
   - Do not replace the established hosted flow with Elements.
   - Keep VAT, tax-ID collection, discounts, billing sync, refunds, and FakturaXL behavior intact.
   - Set the hosted UI mode explicitly and continue sending `adaptive_pricing: { enabled: true }`.

2. **Add a safe test-mode location simulation**
   - In test mode only, derive Stripe’s documented `+location_PL` email when the saved billing country is Poland.
   - Do not attach the existing Customer during that simulated session, because Stripe requires `customer_email` for the location test.
   - Preserve the user’s real email in trusted session metadata so invoice records and delivery continue to use the real address rather than the synthetic Stripe test address.
   - Never modify the authenticated account email or apply this behavior in live mode.

3. **Harden completed-payment handling**
   - Use the trusted original email metadata for test-simulated sessions.
   - Continue using `presentment_details.presentment_currency` and `presentment_amount` for the buyer-facing invoice and FakturaXL document when Stripe converts EUR to PLN.
   - Keep EUR settlement figures for Stripe refund and internal reconciliation logic.

4. **Improve diagnostics**
   - Log whether Checkout used normal location detection or test-mode Poland simulation.
   - Log Adaptive Pricing status and presentment details without logging personal data.
   - Remove the now-disproved assumption that any reused Customer without a currency lock blocks conversion.

## Verification

- Create a Polish test Checkout and confirm the session receives a location-formatted `customer_email`, no saved Customer, and `adaptive_pricing.enabled: true`.
- Open the Stripe-hosted page and confirm the EUR/PLN currency choice appears.
- Complete one test payment and confirm the webhook receives PLN `presentment_details` while settlement remains EUR.
- Confirm the payment record, FakturaXL document, and invoice delivery use PLN amounts and the user’s real email.
- Confirm a non-Polish test Checkout and all live-mode Checkouts retain normal behavior.

## Important production note

In live mode Stripe determines local currency from the real customer context automatically; the synthetic email is strictly a test-mode mechanism documented by Stripe. Adaptive Pricing must also remain enabled for live Checkout in the Stripe payment settings.
