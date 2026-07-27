## Add Apple Sign-In

Facebook and Microsoft aren't supported by Lovable Cloud managed auth, so we're skipping those. Adding Apple only.

### Changes
1. **Enable Apple provider** via Configure Social Login (keeps existing Google + email/password enabled).
2. **`src/pages/Auth.tsx`** — Add a "Continue with Apple" button directly below the existing Google button, same outline style, with an Apple SVG icon. Wire it to `lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin })` with the same error / `redirected` / navigate handling used for Google.

No other files change.
