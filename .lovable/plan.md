## Add Google Sign-In

Add "Sign in with Google" to the auth page using Lovable Cloud's managed Google OAuth (no credentials needed from you — safe defaults).

### Changes

1. **Enable Google provider** on the backend via the Configure Social Login step (keeps email/password enabled too).
2. **`src/pages/Auth.tsx`** — Add a "Continue with Google" button above the email/password tabs (visible on both Sign In and Sign Up), with a divider ("or") separating it from the email form. Wire it to `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`, handling `error` (toast) and `redirected` (return) cases.
3. Google icon rendered inline (SVG) to match the existing button style — no new dependencies beyond the auto-installed `@lovable.dev/cloud-auth-js`.

### Notes
- After Google sign-in, the existing `useAuth` listener picks up the session and the `useEffect` on `/auth` redirects to `/`.
- Existing email/password sign-in and sign-up remain unchanged.
- Only Google is being added. Apple/others can be added later if you want — just say the word.

Want me to proceed?
