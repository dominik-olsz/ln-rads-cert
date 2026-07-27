## Goal
Enable Lovable's built-in Paddle payments so users can purchase courses, with Paddle acting as merchant of record for tax compliance.

## About the paid plan requirement
Yes — **all Lovable payment integrations require a Pro plan or higher**. This applies to Paddle, Stripe, and Shopify. There is no free-tier payments option.

## Why Paddle fits this product
- The eligibility check recommends **Paddle** for this digital learning/certification product.
- Paddle acts as the merchant of record on every transaction: it handles tax calculation, collection, filing, remittance, chargebacks, refunds, and billing-related support automatically.
- Pricing is **5% + 50¢** per checkout transaction (all-inclusive).
- This is a digital course/certification product with no physical goods, which fits Paddle's acceptable use policy.

## Plan

### 1. Enable built-in Paddle payments
- Call `enable_paddle_payments` to create the test environment.
- No Paddle account or API key is required — Lovable manages the integration.
- You will fill out a short form (email, name, business name, etc.) before the integration is created.

### 2. Create Paddle products
- Use `batch_create_product` to create Paddle products/prices for each paid course.
- Set one-time purchase prices matching the course `price` values in the database.

### 3. Implement checkout flow
- Add a "Buy course" / checkout button on course detail and course listing pages.
- Call the Paddle checkout session creation (via Lovable's built-in integration).
- Redirect the user to Paddle Checkout.

### 4. Implement webhook / purchase fulfillment
- Add or update an edge function/webhook handler to listen for Paddle checkout completion.
- On successful payment, insert a record into `course_purchases` and grant the user access to the course and certification test (if `grants_certification_access` is true).

### 5. Verify
- Test a checkout in Paddle's test/sandbox mode.
- Confirm the purchase record is created and course access is granted.

## Out of scope (unless requested)
- Subscription/recurring billing.
- Coupons, trials, or multi-currency pricing.
- Refund flow admin UI.

## Acceptance criteria
- Users can click "Buy" on a course and complete payment via Paddle Checkout.
- After successful payment, the course appears as purchased and certification access is granted where applicable.
- Test-mode transactions work without real money.