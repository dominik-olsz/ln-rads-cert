# Branded auth emails from mail.lnrads.com + working reset/verify links

## What you'll get

- Signup confirmation, password reset, magic-link and email-change emails sent from `no-reply@mail.lnrads.com`, styled with the LN-RADS look (green/orange, logo).
- Clicking "Reset password" or "Verify email" lands on your own app (`cert.lnrads.com`) — never the Lovable login screen.
- A new "Your password was changed" email sent whenever a user changes their password in `/account`.

## Why the links currently break

The reset and confirmation links are built from `window.location.origin`, which is the preview URL when you test from the preview. That preview host sits behind the Lovable login gate, so the link bounces to `lovable.dev/login`. The `otp_expired` error in your link is the second symptom: the link had already been consumed/expired by the time the gate passed you through.

## Steps

1. **Sender domain** — set up `mail.lnrads.com` as the email sending domain (a subdomain, so `cert.lnrads.com` keeps serving the app untouched). You'll add the nameserver records shown during setup at your registrar; sending activates once DNS verifies.
2. **Email infrastructure** — provision the send queue, send log, suppression list and unsubscribe handling.
3. **Branded auth email templates** — scaffold the six auth templates (signup, reset, magic link, invite, email change, reauthentication), then style them with the app's colours, fonts and logo, and copy that matches the site tone.
4. **Fix the links** — introduce a single canonical app URL helper and use it for every auth redirect instead of `window.location.origin`:
   - password reset → `https://cert.lnrads.com/reset-password`
   - signup confirmation → `https://cert.lnrads.com/`
   - email change confirmation → `https://cert.lnrads.com/account`
   Keeps localhost behaviour for local dev, but never uses the auth-gated preview host.
5. **Password-changed notification** — add an app email template and send it from `/account` after a successful password update, from the same sender.
6. **Deploy** the email functions and confirm the reset page (`/reset-password`, already built) handles the recovery link correctly.

## Technical notes

- Sender: `no-reply@mail.lnrads.com`; delegation is on `mail.lnrads.com` only, so the A/TXT records for `cert.lnrads.com` are unaffected.
- New helper `src/lib/appUrl.ts` returning the canonical origin; used in `src/pages/Auth.tsx` (reset), `src/hooks/useAuth.tsx` (signup `emailRedirectTo`), `src/pages/Account.tsx` (email change).
- Auth templates land in `supabase/functions/_shared/email-templates/` with the `auth-email-hook` function; app email templates in `supabase/functions/_shared/transactional-email-templates/` with `send-transactional-email`.
- Supabase Auth Site URL / redirect allow-list must include `https://cert.lnrads.com`.
- Until DNS verifies, auth emails keep coming from the default Lovable sender; the link fix takes effect immediately.
- The unused `RESEND_API_KEY` secret is not needed by this setup and can be removed later.
