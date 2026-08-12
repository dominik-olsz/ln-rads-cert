# Protect paid lesson content without risking another content wipe

Five steps, in order. Steps 4 and 5 wait for your confirmation that 1-3 are good.

## Step 1 - Backup first

Create a snapshot table `lessons_backup_<yyyymmdd>` holding a complete copy of `lessons`, including `content_text` and `content_url`, readable only by the service role. Then report:

- total rows copied
- how many of those rows have non-empty content (text or URL)

Current live state (already checked): `lessons` has 1 row, and 1 row has content. The backup is still created before anything else changes.

## Step 2 - Stop silent content loss on save

Today a failed content load looks identical to "this lesson has no content", and the course save deletes and re-inserts every lesson from screen state - so one failed load can blank real content.

- Content loading will fail loudly instead of quietly returning empty values.
- The course editor will only consider content "loaded" when content came back for every lesson; otherwise saving is blocked with a clear message telling you to reload the page.
- Second safety net: if any lesson that previously had content would be saved empty, the save is refused - unless you actually cleared that field in the editor yourself. In that case you get an explicit confirmation prompt naming the lessons.

## Step 3 - Fix the lesson dialog

The lesson editor dialog in the admin course content view relies on content being handed to it, which silently becomes empty when the load failed - and saving then writes that emptiness back.

- Opening an existing lesson loads its content directly and shows a loading state.
- If that load fails, the dialog shows an error and the Update button stays disabled, so it can never overwrite content with blanks.

## Step 4 - The security fix (column privileges only)

Nothing about who can see which rows changes. The outline stays fully public exactly as today. Only the two body columns get locked down at the column level, so a direct API query cannot read them while the outline still works.

Pre-check finding (already verified): no query anywhere selects all columns from `lessons`. Every read names its columns explicitly:

- admin course builder and admin course content: `id, course_id, title, content_type, order_index, duration, is_free`
- training page: `id, title, content_type, order_index, is_free, duration, course_id`
- course detail page: `id, title, order_index, is_free`
- dashboard: count only
- the `get-lesson-content` function reads the content columns with the service role, which is unaffected by column grants

No lesson insert or update asks for the written row back, so nothing returns the restricted columns to the browser.

## Step 5 - Verification, in this order

1. Anonymous visitor: course outline still lists lessons; a direct API read of the content column returns a permission error.
2. Signed-in buyer: paid lesson content renders in the training view.
3. Admin: course builder loads existing content, saving preserves it, lesson dialog shows and keeps content.
4. Non-purchaser: still receives the purchase-required response.

Findings are reported after each step.

## Technical notes

- Backup: `CREATE TABLE public.lessons_backup_<date> AS SELECT * FROM public.lessons;` with RLS enabled, no policies, grants only to `service_role`.
- `src/lib/lessonContent.ts`: `fetchLessonContent` throws on invoke error or a non-OK payload; `attachLessonContent` propagates (no per-lesson swallow). Adds an `attachLessonContentSafe`-free design - callers handle failure explicitly.
- `src/pages/admin/CourseBuilder.tsx`: `attachLessonContent` failure leaves `contentLoaded` false and surfaces a destructive-save block; new pre-save diff compares each existing lesson's loaded content against the state to be written and aborts on unintended emptying.
- `src/components/admin/LessonDialog.tsx`: loads content via `fetchLessonContent` on open for `lesson?.id`, with `contentLoading` / `contentError` state gating submit.
- Migration (step 4): `REVOKE SELECT (content_text, content_url) ON public.lessons FROM anon, authenticated;` The existing row-level policy and all `INSERT`/`UPDATE` privileges stay untouched.
