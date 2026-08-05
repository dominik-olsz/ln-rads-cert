# Email confirmation on signup + legal pages

## 1. Signup requires email confirmation

- Turn off auto-confirm in the backend auth settings so every new account must click a confirmation link before signing in.
- `signUp()` in `useAuth` will keep sending users back to the site root after confirmation.
- On the Sign Up tab in `/auth`, replace the current "Account created successfully! You can now sign in." toast with a clear "Check your inbox" state: a confirmation panel showing the email address, a note that the link expires, and a "Back to sign in" action.
- Handle the "already registered" and "email not confirmed" errors with friendly messages instead of raw error text.

Note: confirmation emails will be sent with Lovable's default template from a Lovable-owned sender until a branded sender domain is set up. Branded auth emails can be added later as a separate step.

## 2. Consent checkbox

- Add a required checkbox to the Sign Up form: "I agree to the Privacy Policy and Terms and Conditions", with both phrases linking to the new pages (opening in a new tab).
- The Create Account button stays disabled until it is checked; submitting without it shows an inline error.
- Record consent with the account: store the acceptance timestamp and document version in the user's signup metadata and on their profile row, so there is proof of consent (GDPR accountability).

## 3. Two new legal pages

New routes `/privacy-policy` and `/terms` (both public), styled with the existing design system (same container, headings, and typography as the FAQ page), with a "Last updated" date and anchor-linked sections.

**Privacy Policy** (GDPR / Polish law), covering:
- Controller identity: Praktyka Lekarska Cezary Chudobiński, ul. Bursztynowa 2, 95-050 Konstantynów Łódzki, NIP 8291244164, REGON 731020643, contact cert@lnrads.com
- What data is collected (name, email, account and course progress, test attempts, certificates, payment and invoice data incl. billing address and VAT ID)
- Purposes and legal bases (contract performance, legal obligation for invoicing/accounting, legitimate interest, consent)
- Processors/recipients: hosting and backend infrastructure, Stripe (payments), email delivery, Google/Apple where used for sign-in
- Retention (accounting documents 5 years per Polish tax law; account data while the account exists)
- Data subject rights (access, rectification, erasure, restriction, portability, objection, withdrawal of consent) and the right to complain to the Polish DPA (UODO)
- International transfers, cookies/local storage used for the session, and no automated decision-making
- Note that the policy may be updated, with notification of material changes

**Terms and Conditions** (regulamin, compliant with the Polish Act on Provision of Electronic Services and EU consumer law), covering:
- Seller/service provider details as above, and contact channel
- Definitions, scope of services (online courses, certification exams, certificates)
- Account registration rules and technical requirements
- Purchase flow, prices in EUR incl. VAT, payment via Stripe, invoice issued electronically
- Digital-content withdrawal rules: 14-day right of withdrawal for consumers, and the loss of that right once access to the digital content begins with the buyer's express consent — with a withdrawal-form template section
- Certification rules: included attempts, paid extra attempts, and that after all attempts are exhausted the student contacts cert@lnrads.com
- Licence to use content (personal, non-transferable), prohibition of copying/sharing
- Complaints procedure and response deadline, out-of-court dispute resolution and ODR platform
- Liability limits, changes to the terms, governing Polish law and jurisdiction

A visible disclaimer will not be added, but note: these documents are generated templates based on your company data and standard EU/PL requirements — a lawyer should review them before you rely on them commercially.

## 4. Footer and navigation

- Replace the three dead `#` links in the footer with real links to `/privacy-policy` and `/terms` (Cookie Policy content is folded into the Privacy Policy as a cookies section, so that link is dropped unless you want a separate page).
- Register both routes in the router.

## Technical notes

- Auth config change: `auto_confirm_email: false`.
- Consent stored on the `profiles` table via two new columns (accepted terms timestamp + version), populated from signup metadata by the existing new-user trigger.
- New files: `src/pages/PrivacyPolicy.tsx`, `src/pages/Terms.tsx`, plus a small shared legal-page layout component.
- Edited: `src/App.tsx`, `src/pages/Auth.tsx`, `src/hooks/useAuth.tsx`, `src/components/Footer.tsx`.
