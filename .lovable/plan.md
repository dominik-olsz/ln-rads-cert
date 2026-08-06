# Discounts: course sales, per-user discounts, and discount codes

Adds three independent discount layers that all flow correctly into Stripe checkout and the invoice PDFs.

## 1. Course sale price (admin course Basic Info)

In `/admin/courses/:courseId` → Basic Info, next to the price:
- **Discounted price (€)** — optional, must be lower than the regular price
- **Discount valid until** — optional date picker; leaving it empty means the sale never expires
- A small note showing the effective price the student will see

On the public course page (`/courses/:courseId`):
- Old price shown struck through, new price highlighted
- A live countdown clock (days / hours / minutes / seconds) when an end date is set
- When the end date passes, the page automatically falls back to the regular price

## 2. Per-user discount (admin users)

In `/admin/users`, each row gets an editable **Discount %** field (0–100). Saving stores it on the user's profile. This percentage applies on top of the course price (after any active course sale) for every course and every retake purchase that user buys.

## 3. Discount codes (admin dashboard)

New **Discount codes** card on `/admin/dashboard` linking to a management page where the admin can:
- Generate a batch (e.g. 30 codes) with a chosen percentage, optional expiry date, and optional label/campaign name
- See each code, its percentage, status (unused / used / expired), who redeemed it and when
- Copy codes to clipboard / export the batch, and deactivate codes

Rules: each code is single-use (valid for exactly one purchase) and is locked at the moment checkout succeeds.

## 4. Checkout experience

On the course page and the retake purchase step, a **Discount code** input with an Apply button:
- Validates the code server-side and shows the resulting price breakdown (regular price → sale price → your account discount → code discount → total)
- Clear inline errors for invalid, expired, or already-used codes
- The applied code is passed into checkout so Stripe charges the final amount

## 5. Stripe + invoicing

- All discounts are recalculated server-side in `create-checkout`; the client never sets the price.
- The Stripe line item is created at the final discounted amount, so the charge, the webhook amount, and the invoice always agree.
- The invoice line item description lists the applied discounts (e.g. "Course X — sale price, user discount 20%, code SAVE20"), and net/VAT/gross are derived from the actually charged amount, as today.
- Refunds and correction invoices keep working unchanged because they are based on the charged amount.

## Stacking order

Regular price → course sale price (if active) → user discount % → discount code % → final amount (rounded to whole cents, floor at €0.50 minimum Stripe charge; a 100% result is treated as free enrolment without Stripe).

## Technical notes

- **Schema**: `courses` gains `discount_price` and `discount_valid_until`; `profiles` gains `discount_percent`; new `discount_codes` table (code, percent, expires_at, active, redeemed_by, redeemed_at, batch label) with admin-only write access and a server-side validation path for buyers, plus a `redeemed_code_id` reference on purchases/invoices for auditing.
- **Edge functions**: pricing helper shared by `create-checkout` (computes final amount, embeds discount details in session metadata) and `stripe-webhook` (stores discount details, marks the code redeemed, passes discount text to `createInvoice`). New `validate-discount-code` function for the Apply button.
- **Frontend**: `CourseBuilder.tsx` (Basic Info fields), `Users.tsx` (discount column), new `src/pages/admin/DiscountCodes.tsx` + route + dashboard card, `CourseDetail.tsx` and `Courses.tsx`/`CourseCard.tsx` (old/new price, countdown), `CertificationTest.tsx` retake purchase (code input).
