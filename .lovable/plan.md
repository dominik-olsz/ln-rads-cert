## Goal
Enable Lovable's built-in Stripe payments so users can purchase courses, with Stripe acting as merchant of record for tax compliance (Poland/EU-supported).

## Provider choice note
The eligibility check recommends **Paddle** for this digital learning/certification product. Since you explicitly asked for Stripe, this plan proceeds with **Lovable's built-in Stripe payments**.

## Plan

### 1. Enable built-in Stripe payments
- Call `enable_stripe_payments` to create the test environment.
- No Stripe account or API key is required — Lovable manages the integration.

### 2. Set default tax handling
- Poland is in the EU, which is supported for Stripe's full compliance handling.
- Default to `managed_payments`: Stripe handles tax calculation, collection, filing, fraud protection, disputes, and local payment methods for buyers in ~80 countries.
- This adds +3.5% per transaction on top of Stripe base fees and can be changed per transaction or turned off later.

### 3. Create Stripe products
- Use `batch_create_product` to create Stripe products/prices for each paid course.
- Assign the correct Stripe tax code for digital educational products (e.g., `txcd_10103001` — Digital Educational Software, or the closest matching code per Stripe's tax code list).

### 4. Implement checkout flow
- Add a "Buy course" / checkout button on course detail and course listing pages.
- Call the Stripe checkout session creation (via Lovable's built-in integration) with `managed_payments: { enabled: true }`.
- Redirect the user to Stripe Checkout.

### 5. Implement webhook / purchase fulfillment
- Add or update an edge function/webhook handler to listen for Stripe `checkout.session.completed`.
- On successful payment, insert a record into `course_purchases` and grant the user access to the course and certification test (if `grants_certification_access` is true).

### 6. Verify
- Test a checkout in Stripe's test mode.
- Confirm the purchase record is created and course access is granted.

## Out of scope (unless requested)
- Subscription/recurring billing.
- Coupons, trials, or multi-currency pricing.
- Refund flow admin UI.

## Acceptance criteria
- Users can click "Buy" on a course and complete payment via Stripe Checkout.
- After successful payment, the course appears as purchased and certification access is granted where applicable.
- Test-mode transactions work without real money.