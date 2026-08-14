# Fix: resetting attempts should force a fresh certification test

## What I verified

- The student (dominik_olszewski@o2.pl) currently has **zero** certification test attempts and **zero** certificates — the admin reset did delete those.
- But there is still **one open saved session** for the certification course, created today 09:35 UTC, with **both questions already answered and locked** and `time_left = 0`, `current_question_index = 1`. That is exactly the screen the student sees: everything locked, only "Submit Test" available.
- The reset code (both in Test Attempts and in the user profile sheet) does delete saved progress rows, and admins do have permission to delete them. So the leftover row was (re)written **after** the delete — the student's still-open test tab keeps its questions and locked answers in React memory and writes them back: "Start test" reuses or re-inserts an open row, then the next save pushes the old locked answers into it.

Diagnosis of the exact origin of that one row is not 100% provable from data alone, so step 1 of the work is a targeted cleanup plus the guard rails that make this state impossible regardless of how it arose.

## What to change

1. **Stamp resets so stale sessions can't survive them.**
   Record a per-student, per-course "attempts reset at" timestamp when an admin resets. On entering the certification test, any open saved session whose `started_at` is older than that timestamp is deleted and ignored, so the student always starts from question 1.

2. **Make a deleted session fatal to the open tab.**
   Saved progress writes currently ignore the fact that the target row no longer exists. Change them to detect "0 rows updated" and, in that case, stop the test, tell the student their attempt was reset by an administrator, and reload the test from a clean state instead of silently re-uploading old answers.

3. **Never re-adopt a session with pre-locked answers.**
   When starting a test, only reuse an existing open row if it belongs to the current course and was not created by a different in-memory question set; otherwise insert a fresh row with freshly fetched questions and empty answers.

4. **Reject orphaned submissions server-side.**
   `submit-test` already refuses when the progress row is missing. Also refuse when the row's `started_at` predates the recorded reset marker, so a stale tab cannot submit an attempt that was already wiped.

5. **Clean up the current bad row** for this student so the next entry starts fresh.

## Technical notes

- New table `certification_attempt_resets` (user_id, course_id, reset_at) with admin-only write and self-read policies, plus GRANTs; written by both reset paths (`src/pages/admin/TestAttempts.tsx`, `src/components/admin/UserProfileSheet.tsx`).
- `src/pages/CertificationTest.tsx`: load the reset marker alongside attempts; drop open rows with `started_at < reset_at`; harden `saveProgress` (select count / `.select('id')` on update) and `handleStartTest`.
- `supabase/functions/submit-test/index.ts`: compare progress `started_at` to the reset marker before grading.
- One-off delete of the stale open progress row for the affected student.
