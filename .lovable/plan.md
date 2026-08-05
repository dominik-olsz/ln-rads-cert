# Certification retakes: 3 attempts, paid retakes

## Goal

- Attempt 1 is included with the course purchase.
- Attempts 2 and 3 must be paid (default 69 EUR, price editable by admin).
- After 3 failed attempts the student is told to contact cert@lnrads.com.
- Admin can reset a student's attempts so they can start over.

## Student experience

Certification test page, based on how many certification attempts the student already has:

- 0 attempts -> "Start test" as today.
- Passed -> unchanged (already passed, no retake).
- Failed, fewer than 3 attempts used, no paid retake credit -> a "Retake" card showing the current retake price and a "Pay & retake" button that opens Stripe Checkout.
- Failed, has an unused paid retake credit -> "Start retake" directly.
- 3 attempts used and not passed -> message: no attempts left, contact cert@lnrads.com (mailto link). No purchase option shown.

Dashboard certification tab shows attempts used (e.g. "Attempt 2 of 3") and the same retake / contact-admin state.

## Admin experience

- New "Certification" section in the admin area (settings page) with the retake price in EUR, saved to the database. Changing it affects future retake purchases only.
- Existing "Reset Attempts" action on the certification attempts page keeps working and will also clear used retake credits, so a reset student starts again at attempt 1 of 3.
- Admin attempts table gains an "Attempts used" indicator already present via attempt count, plus retake purchases visible per student.

## Technical notes

Database (migration):
- `app_settings` table (key/text, value/jsonb) with public read and admin write; seeded with `certification_retake_price` = 6900 (cents).
- `certification_retake_purchases` table: `user_id`, `amount_paid`, `stripe_session_id` (unique), `consumed_at`, `created_at`. Read: own rows + admin. Insert/update: `service_role` only (written by the Stripe webhook), plus admin delete for resets.
- Grants + RLS for both tables per project convention.

Backend:
- `create-checkout` gains a `type: "certification_retake"` mode: validates the student failed, has used 1 or 2 attempts, has no unused credit, reads the price from `app_settings`, and creates a Stripe session with the digital-education tax code.
- `stripe-webhook` handles the retake session type and inserts the retake purchase row.
- `get-test-questions` replaces the hard "retakes not allowed" block with: allow if attempts used < 3 AND (attempts used == 0 OR an unused retake credit exists); mark the credit consumed when the new attempt starts.
- Attempt counting uses `test_attempts` where `is_certification_test` is true; a completed `certification_test_progress` row is no longer a permanent block, a new progress row is created per attempt.

Frontend:
- `src/pages/CertificationTest.tsx`: replace the single-attempt gate with the attempt-state logic above.
- `src/pages/Dashboard.tsx`: show attempts used and retake/contact state.
- New admin settings page + route for the retake price.
- `src/pages/PaymentSuccess.tsx`: handle the retake purchase confirmation and route back to the certification test.

Project memory note: the existing "retakes are strictly forbidden" rule is replaced by this 3-attempt policy.
