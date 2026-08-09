# Admin user management: search, sorting, and user profiles

Upgrade `/admin/users` from a flat table into a searchable, sortable list plus a full per-user profile view with downloads and manual course access granting.

## 1. Search and sorting on the user list

- Search box above the table filtering by name and email (case-insensitive, live).
- Every column becomes click-to-sort with an ascending/descending indicator: Name, Email, Role, Discount, Joined. Default stays newest first.
- Result count shown next to the search box; empty-search state message when nothing matches.

## 2. User profile drawer

Each row gets a **View profile** action opening a full-height side panel for that user with sections:

- **Overview** — name, email, role, joined date, saved invoice/billing details (buyer type, company, VAT ID, address).
- **Courses** — every course, showing whether the user has access, when it was purchased, and how much they paid. Courses without access show a **Grant access** button.
- **Certification results** — all certification attempts for the user: course, score, pass/fail, date, plus a **Download certificate** button when a certificate exists.
- **Payment history** — course purchases and extra-attempt (retake) purchases: date, item, amount, discount applied, refunded amount, with a **Download invoice** button per matching invoice.
- **Discount** — the same per-user percentage editor as the table, editable from the profile.

Progress/notes are out of scope for this pass.

## 3. Downloads

- **Certificates** — reuse the existing certificate generator (admins can already generate for any attempt) and download it directly from the profile.
- **Invoices** — download the stored invoice PDF via a short-lived secure link; if a PDF was never stored, the existing regenerate action produces it first.

## 4. Granting course access manually

- **Grant access** on a course the user hasn't bought creates a purchase record marked as manually granted by an admin, with amount 0, so the user immediately sees the course in their dashboard and can take the certification test under that course's attempt rules.
- A confirmation step states that no payment is taken and no invoice is issued.
- Manually granted access is labelled as such in the profile, and can be revoked with a **Remove access** button.

## Technical notes

- `src/pages/admin/Users.tsx`: add `search` + `sort` state with a derived filtered/sorted list and a reusable sortable header (same pattern just added to `TestAttempts.tsx`).
- New `src/components/admin/UserProfileSheet.tsx` (shadcn `Sheet` + `Tabs`) fetching per-user data on open: `profiles`, `courses`, `course_purchases`, `test_attempts`, `certificates`, `certification_retake_purchases`, `invoices`. Admin SELECT policies already exist on all of these.
- `course_purchases` has **no INSERT policy** (writes are webhook-only), so granting access needs a new edge function `admin-grant-course-access` that validates the caller's admin role via `has_role`, then inserts/deletes with the service role. Migration adds a nullable `granted_by_admin` boolean (or equivalent flag) to `course_purchases` so manual grants are distinguishable from paid ones, plus admin-visible labelling.
- Invoice downloads: the `invoices` storage bucket is private, so the function/existing `invoice-actions` path returns a signed URL rather than a public link.
- Certificates: reuse `generate-certificate` with `attemptId`; it already allows admins to target any attempt.
