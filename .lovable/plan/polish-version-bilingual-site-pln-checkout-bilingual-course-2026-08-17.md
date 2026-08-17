# Polish version: bilingual site, PLN checkout, bilingual course content

Adds a full Polish version of the public/student side at `/pl/...`, lets buyers pay in PLN via Stripe's own conversion, keeps FakturaXL invoices consistent with the paid currency, and lets you author lessons, use cases and certification questions in both languages with English fallback.

Nothing existing changes behaviour for current English visitors: all current URLs stay exactly as they are, and untranslated content keeps showing English.

## 1. Language layer (UI)

- Add a lightweight translation setup: one dictionary file per language (`en`, `pl`) plus a `useT()` hook and a `LanguageProvider` that derives the language from the URL (`/pl/...` = Polish, everything else = English).
- Add a PL/EN switcher in the navbar (desktop and mobile menu) and in the footer. Switching keeps you on the same page, just with/without the `/pl` prefix.
- Every public/student page gets a mirrored Polish route: home, courses, course detail, training, tests, results, dashboard, account, payments, payment success, FAQ, auth pages, privacy policy, terms, unsubscribe. Admin panel stays English.
- Language is remembered (stored locally) so links and redirects inside the app keep the chosen language.
- SEO: per-language `<title>`/description via the existing `Seo` component, `hreflang` alternate links between the EN and PL version of each page, `lang` attribute on `<html>`, and the sitemap generator extended to emit both language variants.

## 2. Legal + FAQ + emails

- Privacy policy and terms get Polish copy. I will use a machine translation of your current English text as a starting point and clearly mark it for your review — legal wording should be checked by you before publishing.
- FAQ items get optional Polish question/answer fields in the admin FAQ editor, with English fallback.
- Transactional emails (invoice issued, certificate, auth emails) pick the recipient's language from their stored profile language, falling back to English. Invoice PDFs come from FakturaXL and are already bilingual.

## 3. Paying in PLN (Stripe Adaptive Pricing)

- Prices stay authored in EUR only; no second price list to maintain.
- Checkout keeps EUR as the presentment base and enables Stripe Adaptive Pricing, so buyers in Poland are offered PLN at Stripe's own converted amount, and Polish 23% VAT keeps being calculated by Stripe Tax as today.
- You need to switch Adaptive Pricing on in your Stripe dashboard (Settings → Payments → Adaptive Pricing) for both test and live mode. I will tell you exactly where after the code is in.
- The site shows EUR prices with a note that Polish buyers can pay in PLN at checkout; showing a hard PLN figure on the site would need app-side conversion, which you chose not to do.

## 4. Invoicing / FakturaXL

- The webhook already reads the actual amounts from the Stripe session; it will now also read the **settlement currency and amount** Stripe actually charged, so a PLN payment is recorded and invoiced in PLN rather than EUR.
- Invoice rows store that currency, and FakturaXL receives the matching currency. For PLN documents the NBP exchange-rate fields are skipped (they only apply to non-PLN invoices); for EUR it keeps working exactly as now.
- Line item descriptions on invoices are sent bilingually (Polish / English), matching the bilingual document language already configured in FakturaXL.
- `/payments` and `/admin/sales` display each document in its own currency instead of hardcoding EUR.

## 5. Bilingual course content

- Courses, lessons, course materials, use cases and certification questions get optional Polish counterparts of their text fields (title, description, content, question text, answer options, explanations, group titles). Images and files stay shared.
- Admin course builder: each text field gets an EN/PL tab so you can fill in Polish next to English. Untranslated fields stay empty and are marked.
- Reading side (course detail, training, tests, certification test, results, certificates) resolves Polish first and falls back to English per field — so a partially translated course is fully usable in Polish from day one.
- The edge functions that serve protected content (`get-lesson-content`, `get-test-questions`, `check-answer`, `submit-test`) accept a language and return the localized text, while grading, points and correct answers stay language-independent — scores and existing attempts are unaffected.

## Technical notes

- Routing: keep the current flat route list and generate a second `/pl` branch from the same page components, so no page is duplicated. Internal links go through a small `useLocalizedPath()` helper.
- Database: additive migration only — new nullable `*_pl` columns on `courses`, `lessons`, `course_materials`, `test_questions`, `faq_items`, plus a `language` column on `profiles`. No existing column is changed or dropped, so nothing can break for current data.
- Stripe: `adaptive_pricing: { enabled: true }` on the Checkout Session, `managed_payments` stays disabled so tax liability remains with your Polish company (the current 23% VAT fix is untouched).
- Webhook: read `currency` plus `amount_total` from the completed session (and the balance transaction when needed) rather than assuming EUR.

## Suggested order

1. Language layer, routes, navbar switcher, SEO/hreflang (no behaviour change for EN).
2. Database migration for the `*_pl` fields and profile language.
3. Admin EN/PL editing tabs + fallback-aware reading of course content.
4. Stripe Adaptive Pricing + currency-aware webhook, invoices, FakturaXL, sales/payments display.
5. Polish copy for UI strings, legal pages and emails, then a full test purchase in Stripe test mode to confirm a PLN invoice lands correctly in FakturaXL.
