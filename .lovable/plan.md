# Account settings: password, email, and billing details

Add a self-service account area for signed-in users, reachable from the dashboard and from the email shown in the navbar.

## 1. Account page

New route `/account` with three sections:

**Security**
- Change password: current password, new password, repeat new password. The current password is verified by re-authenticating with the user's email before the change is applied.
- Change email: new email + confirm. A confirmation link is sent to the new address; the change only takes effect once confirmed. Clear on-screen note about that.

**Invoice details**
- Buyer type: Private person / Company.
- Common fields: full name, address line 1, address line 2, postal code, city, country (dropdown).
- Company only: company name and VAT number (required when Company is selected; VAT-ID format checked lightly, EU country + VAT ID triggers reverse charge in the invoicing engine already in place).
- Saved to the user's profile so it is reused on every purchase.

**Entry points**
- Navbar: the email becomes a dropdown with "Account settings" and "Sign out" (mobile sheet gets the same link).
- Dashboard: an "Account settings" button in the header.

## 2. Checkout behaviour

- If invoice details are saved, checkout is pre-filled with name, address, and VAT number, so the buyer does not retype them.
- If they are not saved, checkout still collects address and VAT number as it does today, and whatever the buyer enters there is written back to their profile so the next purchase is pre-filled.
- Invoices keep using the address/VAT actually captured for the payment, so the generated PDF, VAT rate, and reverse-charge rule stay correct in both paths.

## Technical notes

- Migration on `profiles`: `buyer_type` ('private' | 'company'), `company_name`, `vat_id`, `address_line1`, `address_line2`, `postal_code`, `city`, `country`. Users can read/update only their own row (existing policies already scope this; the discount-protection trigger stays untouched).
- New page `src/pages/Account.tsx` + route in `src/App.tsx`; `src/components/Navbar.tsx` gets a dropdown menu; `src/pages/Dashboard.tsx` gets a link.
- Password change: `signInWithPassword` to verify the old password, then `supabase.auth.updateUser({ password })`. Email change: `supabase.auth.updateUser({ email })` with the existing `/reset-password`-style confirmation handling.
- `create-checkout`: load the profile billing row and pass it to Stripe via a reusable Customer (name/address/tax id) or prefilled `customer_details`; keep `billing_address_collection: "required"` and `tax_id_collection` for users without saved data.
- `stripe-webhook`: after `buyerFromSession`, persist the captured address/VAT back onto the profile when the profile has no billing data yet. Invoice creation logic in `_shared/invoice.ts` is unchanged.
- Zod validation on the account form, both for the password rules and the invoice fields.
