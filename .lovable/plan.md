# Polish homepage, editable legal pages, navbar polish

## 1. Editable Privacy Policy and Terms in admin

Today both pages are hard-coded English React text, so you cannot change a word without a code edit.

- New database table `legal_documents` holding one row per document (`privacy-policy`, `terms`) with: title, subtitle, body and "last updated" date — each in English and Polish.
- Bodies are stored as Markdown (headings, lists, bold, links, e-mail links) — simple to edit and safe to render.
- Seed both rows with the current English text converted to Markdown, plus a Polish translation, so nothing disappears.
- New admin screen `/admin/legal` (linked from the admin dashboard, same style as the FAQ manager): pick document, pick language tab (EN / PL), edit title, subtitle, "last updated" and body with a live preview, then Save.
- `/privacy-policy` and `/terms` render the row for the current language, falling back to English if a Polish body is empty. The existing hard-coded text stays in the code as a last-resort fallback if the row cannot be loaded.
- Access rules: everyone can read published legal documents; only admins can edit them.

## 2. Polish homepage

The homepage (`Index.tsx` + `Hero.tsx`) currently has no translation calls at all. Every visible string — hero, "Course Overview", the five LN-RADS category names and descriptions, the three feature cards, the remaining sections and CTAs, plus the page title/description used for search engines — gets wrapped in the existing `t()` helper and added to the Polish dictionary (`src/i18n/pl.ts`). No layout or logic changes.

## 3. Polish footer

Same treatment for `Footer.tsx`: description paragraph, "Quick Links", "Resources", link labels, and the bottom bar (copyright, legal links) go through `t()` with Polish entries added.

## 4. Flag without a border

Remove the border, padding box and hover background from the language button in `LanguageSwitcher.tsx` — just the flag glyph, still clickable with its accessible label.

## 5. "Eduradiologia" in the Polish navbar

The navbar tagline under the LN-RADS wordmark becomes `t("Eduradiology")`, with the Polish dictionary mapping it to "Eduradiologia".

## Technical notes

- Migration: `create table public.legal_documents (slug text primary key, title_en/pl, subtitle_en/pl, body_en/pl, last_updated_en/pl, timestamps)`, with `GRANT SELECT` to `anon`/`authenticated`, full grants to `service_role`, RLS enabled, public read policy and admin-write policies via `public.has_role`, plus the shared `updated_at` trigger. Seed inserts for both slugs.
- Markdown rendering uses a small, dependency-light renderer (`react-markdown` if not already present) inside the existing `LegalPage` / `LegalSection` styling wrapper.
- Translations follow the existing pattern: English source string as the dictionary key, so any untranslated string keeps rendering in English.
