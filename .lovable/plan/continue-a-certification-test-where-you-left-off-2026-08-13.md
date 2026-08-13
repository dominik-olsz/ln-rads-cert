# Continue a certification test where you left off

Students should be able to take the certification test in parts: leave (or log out, or lose the timer) and come back to the same question with all accepted answers intact.

## What's wrong today

The page already has resume logic, but it never matches the saved session:

- When the test starts, the progress row is saved **without the course**. The most recent saved session in the database has an empty course, while the test page looks for a session for the current course. It finds nothing, so the student is sent back to a brand-new test.
- Because no session is found, the earlier locked answers are silently abandoned and a fresh attempt can be started, leaving orphaned sessions behind.

## What changes

1. **Save the course with the session.** Starting a test stores the course id on the progress row, so returning to `/certification-test?courseId=…` finds the right session.
2. **Reuse one open session per course.** If an unfinished session already exists for that student and course, resume it instead of creating another. New sessions are created only when there is no open one.
3. **Resume exactly where the student stopped.** Restore the saved questions, all accepted (locked) answers, and the question index. Show the same "Resuming test" notice, and take the student straight into the test (no welcome screen).
4. **Timer rule on leaving (as chosen).** The question that was open when the student left is locked with whatever was selected at that moment (blank counts as unanswered). Every other question resumes untouched. On return:
   - if that question is locked, the student sees it as locked with its recorded answer and can move forward;
   - the next unanswered question opens with a fresh 30 seconds.
5. **After the time ran out.** A timed-out question is already locked, so returning shows it locked and lets the student continue with the remaining questions instead of restarting.
6. **Repair existing sessions.** Old progress rows with no course are attached to the correct course where it can be determined from their saved questions, so students mid-test today can resume too.

## Technical notes

- `src/pages/CertificationTest.tsx`
  - `handleStartTest`: include `course_id: courseId` in the insert; guard against creating a second open row (re-check for an unfinished row first).
  - `checkExistingAttemptAndFetchQuestions`: keep the existing resume branch, and additionally match rows where `course_id` is null but the saved questions belong to this course (legacy rows). Ensure the gate checks (passed / exhausted / payment) stay bypassed for a resumable session, as they are now.
  - Resume path: if the restored current question is locked, jump the student to the first unlocked question (or keep them on the locked one at the end of the test) and start the 30s timer only for an unlocked question.
  - Keep the existing unmount / `beforeunload` lock-and-save behaviour (this is the chosen timer rule) and make sure `saveProgress` also persists `current_question_index`.
- One data migration to backfill `certification_test_progress.course_id` for unfinished rows using the course of the questions stored on the row.
- No schema change needed: `certification_test_progress` already has `course_id`, `answers`, `questions`, `time_left`, `current_question_index`, `is_completed`.
