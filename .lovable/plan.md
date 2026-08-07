# Keep auth email links on cert.lnrads.com (fix PHISHING classification)

Your diagnosis matches what the code does. The auth email hook passes Supabase's raw verify URL straight into the templates:

```
confirmationUrl: payload.data.url
// -> https://<project>.supabase.co/auth/v1/verify?token=<hash>&type=recovery&redirect_to=...
```

The hook also sets `siteUrl` to `https://mail.lnrads.com` (the sending domain, not the app), which adds a second mismatched domain to the body.

Every link can be rebuilt on `https://cert.lnrads.com` from the hook payload's token hash, with URL parsing only as a fallback.

## 1. Rewrite links in the auth email hook

In `supabase/functions/auth-email-hook/index.ts`:

- Read the token hash from the hook payload first: `token_hash`, and `token_hash_new` for the new address in an email change. Note: the typed surface of the Lovable email payload helper currently declares only `token` / `new_token`, so the implementation will read the hash fields off the raw payload defensively and only then fall back to extracting the `token` query param from `payload.data.url`. String-parsing the verify URL is the last resort, never the primary path.
- Build the link on the canonical app origin `https://cert.lnrads.com`:
  - recovery -> `/reset-password?token_hash=...&type=recovery`
  - signup -> `/auth/confirm?token_hash=...&type=signup`
  - magiclink -> `/auth/confirm?token_hash=...&type=magiclink`
  - invite -> `/auth/confirm?token_hash=...&type=invite`
  - email_change -> `/auth/confirm?token_hash=...&type=email_change`
- **Email change sends two messages** when secure email change is on (old address and new address). Rewrite both: the message to the old address uses the old-address token hash, the one to the new address uses `token_hash_new`. The template will render whichever hash belongs to that recipient, so neither link keeps a `supabase.co` host.
- Fall back to the original URL only if no hash can be found at all, so emails never break silently.
- Set `siteUrl` to `https://cert.lnrads.com`.

No `supabase.co` host appears in any email body afterwards. `reauthentication` is a code-only email and needs no link.


## 2. Strip the invisible preheader padding

React Email's `<Preview>` component is what emits the long run of zero-width characters. Remove `<Preview>` from all six templates in `supabase/functions/_shared/email-templates/` and let the first visible line act as the preheader. Copy stays unchanged otherwise.

## 3. Client-side verification pages

`src/pages/ResetPassword.tsx`:
- Read `token_hash` and `type` from the query string.
- Call `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` on mount; show the new-password form on success and call `supabase.auth.updateUser({ password })` as today.
- Keep the existing recovery-session path so links already in inboxes still work.

New `src/pages/AuthConfirm.tsx` at route `/auth/confirm`:
- Reads `token_hash` and `type` (`signup`, `magiclink`, `invite`, `email_change`).
- Calls `verifyOtp` with the matching type, shows a branded verifying/success/error state, then redirects: `/dashboard` for signup, magiclink and invite, `/account` for email_change.
- Register the route in `src/App.tsx`.

Error handling on both pages (`verifyOtp` returns an `error` object, it does not throw):
- Explicit states for missing/malformed params, expired token, and already-used token — matched on the returned error message/status rather than assumed.
- Each error state renders a branded card with a plain-language explanation ("This link has expired or has already been used") and a button to request a fresh email (`/auth` for reset/signup, `/account` for email change). Never a blank page or a silent redirect.
- `updateUser` failures on the reset page surface the same way instead of only a toast.

## 4. Site URL and redirect allow-list (needs a config change)

Current project auth config: Site URL is `https://ln-rads-cert.lovable.app`, and the allow-list already contains `https://cert.lnrads.com/**` (plus the other project hosts). So:
- The allow-list entry you asked about is present.
- The Site URL is wrong for your intent and should be `https://cert.lnrads.com`. It is not `mail.lnrads.com`, so nothing points at the sending domain — but it still resolves `{{ .SiteURL }}` and default redirects to the Lovable host. Changing it is a Cloud auth setting, not code; the tooling I have does not expose Site URL, so this one needs to be set in Cloud → Users → Auth settings (I'll point you at the exact field). The code changes above do not depend on it, since the token_hash links are absolute and use no `redirect_to`.

## 5. Points that are platform-side, not code

- **Quoted-printable vs base64 encoding and `List-Unsubscribe`**: applied by the managed sending pipeline, not by our function. App (non-auth) emails already get an unsubscribe footer; auth emails are exempt by design.
- **Dedicated sending IP**: the pool is shared platform infrastructure (`Lovable Custom Domains`); no per-project dedicated IP option is exposed to me. Needs a support request.
- **Supabase custom domain add-on**: not available for Lovable Cloud projects — there is no self-serve path to it. The token_hash change above solves the same problem at the app level.


## 5. Deploy and verify

Deploy `auth-email-hook`, then trigger one password reset and one signup and confirm the rendered link starts with `https://cert.lnrads.com` and that OVH no longer flags the message.

## Technical notes

- Token extraction reads the `token` param of the Supabase verify URL; for `email_change` Supabase issues a token per address, so `new_token` is preferred when present.
- `src/lib/appUrl.ts` already pins the canonical origin for links generated in the app; the hook gets its own constant since it runs server-side.
