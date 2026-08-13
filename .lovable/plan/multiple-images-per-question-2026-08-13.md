# Multiple images per question

## What you get

A question can carry several images instead of just one.

In the admin course builder (both the Use Cases groups and the Certification Test tab):

- The image field becomes an "Images (optional)" area where you can upload several files at once, or add them one after another
- Each uploaded image shows as a thumbnail with a remove (X) button
- Images keep the order you added them
- Existing questions keep their current image — it simply becomes the first image in the list

For students, in training and in the certification test:

- All images for a question are shown stacked above the question text
- Tapping any of them opens the zoomable viewer with the full set, so you can swipe/arrow between them (same viewer already used for lesson images)

## Technical notes

- Database: add `image_urls text[] not null default '{}'` to `public.test_questions`, backfilled from the existing `image_url` for rows that have one. `image_url` stays in place (kept in sync with the first entry) so nothing else breaks.
- `supabase/functions/get-test-questions/index.ts`: include `image_urls` in the selected columns so both training and certification payloads carry it.
- Admin (`src/pages/admin/CourseBuilder.tsx`): replace the single-file upload for both question editors with a multi-file input (`multiple`), uploading each file to `course-materials/question-images/`, appending public URLs to `image_urls`; add per-thumbnail remove. Save paths (around the group-question and certification-question upserts) write `image_urls` plus `image_url: image_urls[0] ?? null`.
- `src/components/admin/TestQuestionDialog.tsx` and `src/pages/admin/CourseContent.tsx`: read/write the array too, so the standalone dialog and the read-only content view stay consistent.
- Students (`src/pages/Training.tsx`, `src/pages/CertificationTest.tsx`): render `question.image_urls` (falling back to `[image_url]`) and pass the clicked element into the existing lightbox helper so the index is correct.
- No changes to grading or answer logic.
