# Stripe payments with your own Stripe account

You provide your own Stripe secret key, and the app talks to Stripe directly. No Lovable-managed payment provider is used.

## What you'll need to supply
1. **Stripe secret key** (`sk_live_...` or `sk_test_...`) — Stripe Dashboard → Developers → API keys.
2. **Webhook signing secret** (`whsec_...`) — created after I deploy the webhook endpoint, so I'll give you the URL first and ask for the key afterwards.

I'll request both through the secure secret form; they are never written into the codebase.

## Current state
- `src/pages/CourseDetail.tsx` "Buy Course" inserts a row straight into `course_purchases` with no payment at all — anyone can grant themselves a course.
- `course_purchases` has an INSERT policy allowing users to insert their own rows. This must be locked down so only the server (webhook) can create purchases.
- One paid course exists (LN-RADS Certification, 199 EUR).

## Plan

### 1. Enable the bring-your-own-key Stripe integration
Store `STRIPE_SECRET_KEY` as a backend secret.

### 2. Database changes
- Remove the client-side INSERT policy on `course_purchases`; inserts happen only via the webhook (service role).
- Add `stripe_session_id` (unique, nullable) to `course_purchases` for idempotency and to prevent double-crediting.

### 3. Edge function: `create-checkout`
- Requires a signed-in user (JWT validated in code).
- Reads the course price from the database (never trusts a price sent by the browser).
- Blocks checkout if the user already owns the course.
- Creates a Stripe Checkout Session (one-time payment, EUR), with `client_reference_id` = user id and `course_id` in metadata.
- Returns the Checkout URL.

### 4. Edge function: `stripe-webhook`
- Public endpoint (no JWT), verifies the Stripe signature with `STRIPE_WEBHOOK_SECRET`.
- On `checkout.session.completed`, inserts the `course_purchases` row using the service role (course access + certification access follow automatically from the existing purchase check).
- Idempotent via `stripe_session_id`.

### 5. Frontend
- `handleBuyCourse` in `CourseDetail.tsx` calls `create-checkout` and redirects to Stripe.
- Add `/payment-success` and `/payment-cancelled` handling: success page polls for the purchase record (webhooks arrive within seconds) and then routes into the course.
- Same purchase entry point kept consistent on the course card / listing.

### 6. Verify
- Use Stripe test mode with card `4242 4242 4242 4242`, confirm the purchase row appears and training/certification unlock.

## Notes
- Tax: with your own Stripe account you are the merchant of record — VAT registration, filing and remittance are your responsibility. I can optionally switch on Stripe Tax (`automatic_tax`) so tax is calculated and collected at checkout; say the word and I'll include it.
- Refunds are handled in your Stripe Dashboard; a `charge.refunded` handler that revokes access can be added later if you want.
