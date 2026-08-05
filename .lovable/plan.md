# Per-Course Certification Tests, Attempt Rules & Free Content

Move certification test management into the course builder, make it optional and configurable per course, add per-course attempt/pricing rules, and let admins mark lessons and question groups as free preview content.

## 1. Certification Test tab in the course builder

`/admin/courses/:id` gets a new tab between **Course Content** and **Preview**:

- Toggle: **This course has a certification test** (off by default).
- When on, choose the question source:
  - **Custom questions** — build a dedicated certification question list in this tab (same editor UX as course questions: text, 4 options, correct answer, explanation, image).
  - **Random from course questions** — enter how many questions the test should draw from the course's own question pool. If the requested number exceeds the pool, an inline warning shows: e.g. "Only 50 questions available in this course — reduce the test length or add more questions." Saving with an invalid number is blocked.
- The tab shows the current course question pool size so the admin can pick a sensible number.
- The standalone `/admin/test` page and its nav link are removed. Existing certification questions that aren't tied to a course are assigned to the **LN-RADS Certification** course so its test keeps working.

## 2. Attempt rules in Basic Info

Directly under "Grants Certification Test Access", three inputs (only relevant when certification is enabled):

- **Attempts included in price** (default 1)
- **Total attempts allowed** (default 3)
- **Price per extra attempt (€)** (default 69)

These replace the single global retake price. The certification flow, retake checkout, and the "no attempts left → contact cert@lnrads.com" message all read the values from the course.

## 3. Free lessons and question groups

- In the Course Content tab, each lesson and each question group gets a **Free preview** toggle.
- `/training/:id` becomes viewable without purchase (and without login): the full course outline is listed so visitors see what's inside, but only items marked free are clickable/openable. Locked items show a lock icon and a buy prompt.
- Purchasers keep full access exactly as today. Progress tracking, bookmarks, and completion stay logged-in-only.

## Technical notes

**Database (one migration):**
- `courses`: add `certification_enabled` (bool, default false), `certification_mode` (text, `custom` | `random`, default `random`), `certification_question_count` (int, nullable), `attempts_included` (int, default 1), `attempts_total` (int, default 3), `retake_price` (int, default 69).
- `lessons`: add `is_free` (bool, default false).
- `test_questions`: add `is_free` (bool, default false) — set per question group by the builder.
- Data fix: `UPDATE test_questions SET course_id = <LN-RADS id> WHERE test_type = 'certification' AND course_id IS NULL`.
- RLS: `lessons` and `test_questions` (course type) already readable by everyone / gated server-side; free-content reads for anonymous visitors go through the existing `get-test-questions` function, which will return only free questions when the caller has no purchase.

**Edge functions:**
- `get-test-questions`: certification branch becomes course-scoped — reads the course row, enforces `attempts_total` against `test_attempts` for that course, checks retake credits, and builds the question set either from the custom certification questions or by randomly sampling `certification_question_count` from the course pool (returns an error if the pool is too small). Course branch returns only `is_free` questions when the caller is unauthenticated or has no purchase.
- `create-checkout`: retake price is read from the course row instead of `app_settings`.

**Frontend:**
- `src/pages/admin/CourseBuilder.tsx`: new tab, attempt inputs, free toggles, save logic.
- `src/pages/CertificationTest.tsx` / `Dashboard.tsx`: use per-course attempt counts and price.
- `src/pages/Training.tsx`: remove the hard purchase redirect, gate item selection on `is_free` when not purchased.
- `src/pages/admin/Tests.tsx` deleted; route and nav link removed.
- `src/pages/admin/TestAttempts.tsx`: drop the global retake price card (now per course).
