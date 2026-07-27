
## Add password reset flow

Let users request a reset email from the sign-in tab and set a new password on a dedicated page.

### 1. Sign-in tab — "Forgot password?" link
In `src/pages/Auth.tsx`, under the Sign In card:
- Add a small "Forgot password?" link right-aligned near the password label.
- Clicking it swaps the card body to a "Reset password" view (email input + Send reset link + Back to sign in), keeping user inside the same Tabs.
- On submit, call `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${window.location.origin}/reset-password })` and show a success toast ("Check your email for a reset link").

### 2. New page `/reset-password`
Create `src/pages/ResetPassword.tsx`:
- Public route, styled to match Auth page (logo, card).
- On mount, listen for `supabase.auth.onAuthStateChange` — Supabase auto-creates a recovery session from the URL hash (`type=recovery`). If no recovery session appears, show an "Invalid or expired link" state with a link back to `/auth`.
- Form: new password + confirm password. On submit call `supabase.auth.updateUser({ password })`, then toast success and navigate to `/auth` (also sign out to force fresh login).

### 3. Route wiring
In `src/App.tsx`, add:
```
<Route path="/reset-password" element={<ResetPassword />} />
```
above the catch-all.

### Notes
- No backend/schema changes; uses built-in Lovable Cloud auth recovery emails (default templates are fine — no custom email templates requested).
- No changes to `useAuth.tsx` needed; the reset page uses `supabase` directly.
