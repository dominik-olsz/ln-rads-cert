# Free preview for visitors who are not signed in

Goal: a visitor with no account can open a course, see which items are free, and actually go through that free content — without being pushed to sign in or buy.

## What's blocking it today

- The backend function that returns course content (`get-test-questions`) requires a logged-in token. Anonymous calls fail with `401 Authentication required`, so a visitor gets no free Use Cases at all. The function's own code already handles the anonymous case correctly — only the gate in front of it rejects the request.
- On the course page, both action buttons ("Start Training" / "Take Certification Test") immediately redirect to `/auth` when nobody is signed in, so a visitor never reaches the training view.
- The course page outline shows every item identically — no indication of which items are free preview.

The training view itself is already visitor-safe: it locks non-free lessons, shows locked question groups as metadata only, and skips all per-user queries when there's no session.

## Changes

1. Allow anonymous calls to the course-content function so free items are returned to visitors. Certification requests inside the same function keep requiring a signed-in user with a purchase (unchanged).
2. On the course page:
   - Load lessons with their free flag and mark free items in the outline with a "Free preview" badge; other items get a lock icon.
   - For visitors (not signed in) and signed-in users who haven't bought: if the course has at least one free item, show a "Preview free content" button that goes to the training view. Keep "Buy Course" as the primary action.
   - Remove the forced sign-in redirect from the preview path; buying and certification still require sign-in.
3. In the training view, keep everything visitor-facing read-only: no progress saving, no bookmarks for anonymous users (already the case), and show a "Sign in / Buy course" prompt when a visitor clicks a locked item.
4. If a course has no free content at all, a visitor is sent back to the course page with a "purchase required" message (current behaviour, kept).

## Technical notes

- `supabase/config.toml`: set `verify_jwt = false` for `get-test-questions`. Authorization is still enforced inside the function via the caller's token and the purchase lookup.
- `src/pages/CourseDetail.tsx`: include `is_free` in the lessons query, thread it into `CourseItem`, use the function's `lockedGroups`/`questions` split to know which question groups are free, render badges, and add the preview button + relaxed `handleStartTraining` for the preview case.
- `src/pages/Training.tsx`: add a locked-item CTA (sign in or buy) for anonymous visitors; no change to the existing locking logic.
- No database or schema changes.
