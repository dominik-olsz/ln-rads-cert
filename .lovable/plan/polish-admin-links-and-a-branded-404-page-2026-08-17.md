# Polish admin links and a branded 404 page

## 1. Admin panel reachable from the Polish version

Admin screens are registered only at `/admin/...`. In the Polish version every internal link is automatically prefixed with `/pl`, so the Admin button points at `/pl/admin/dashboard`, which matches no route and falls through to the 404 page.

Fix: add a redirect route under `/pl` that catches `/pl/admin/*` and sends the visitor to the same path without the prefix (`/pl/admin/dashboard` → `/admin/dashboard`, `/pl/admin/courses/123` → `/admin/courses/123`). The admin panel itself stays English, exactly as requested, and existing `/admin/...` links keep working unchanged.

## 2. 404 page matching the rest of the site

The current 404 is unstyled (grey background, blue underlined link, hard-coded English). It will be rebuilt with the site's design system:

- Site navbar on top, shared footer below (as with all other pages), page centered on the standard background.
- Large "404" in the brand gradient/primary colour, heading "Page not found" and a short explanatory line, using the same typography scale as other pages.
- Two buttons in the site's button styles: "Back to Home" and "Browse Courses", both language-aware so a Polish visitor stays in `/pl`.
- Fully translated: the headings, text and buttons go through the existing translation helper with Polish entries added.
- Keeps the existing console log of the unknown path for debugging, plus a `noindex` SEO tag so search engines don't index 404s.
