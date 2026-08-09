# Flexible answer options and points-based scoring

Move from fixed 4 options with one correct answer to a flexible list of options (6 by default) where each option is worth 2, 1, or 0 points. Applies to both course Use Cases and certification tests.

## 1. Question editing (admin)

In the Course Content tab and the Certification Test tab, each question gets:

- A list of answer options, **6 empty options by default** for new questions.
- Add option / remove option controls (minimum 2, maximum 8).
- Next to each option, a scoring selector: **Correct (2 pts)**, **Semi-correct (1 pt)**, **Wrong (0 pts)**.
- More than one option may be marked Correct and/or Semi-correct.
- Validation before save: all shown options filled in, and at least one option marked Correct.
- Explanation field stays as-is; it is shown together with the correct answer(s) after answering.

Existing questions are converted automatically: their A-D texts become the first four options, the previously stored correct answer becomes the only Correct (2 pts) option, the rest become Wrong.

## 2. Taking a test

- Students still pick exactly **one** answer per question.
- All available options are shown (however many the admin defined).
- Practice/training feedback shows the points earned for the chosen answer, which option(s) are correct, and the explanation.

## 3. Scoring

- Max points per question = 2, so 100 questions = 200 points.
- A result is expressed as points earned out of max points, plus the percentage of max points.
- Certification pass rule uses a **required percentage of points** that the admin sets per course in the Certification Test tab (labelled "Passing score (% of points)", default 80). Course practice tests keep their current informational threshold.
- Results page and admin attempt lists show points (e.g. "164 / 200") alongside the percentage.

## Technical notes

**Database (one migration):**
- `test_questions`: add `options jsonb not null default '[]'` — array of `{ text: string, points: 0 | 1 | 2 }` in display order. Keep `option_a..option_d` / `correct_answer` columns for now (backfilled, no longer read) so nothing breaks mid-deploy.
- Backfill `options` from the existing four columns and `correct_answer`.
- `courses`: add `certification_pass_percent int not null default 80`.
- `test_attempts`: add `points_earned int` and `points_possible int`; existing rows keep score-only data.

**Edge functions:**
- `get-test-questions`: return `options` (text only, points stripped) instead of the four option columns; keep the training branch returning correct answers/explanations for free/purchased practice questions, now as the list of option indexes with their points.
- `check-answer`: grade by looking up the chosen option's points; respond with `points`, the correct option indexes, and the explanation.
- `submit-test`: sum points per answer (2/1/0), compute `points_earned`, `points_possible = 2 × question count`, percentage, and `passed` using the course's `certification_pass_percent` for certification attempts (80% default for course tests). Store points on the attempt.
- Certification progress snapshots (`certification_test_progress.questions`) store the option list, so in-flight attempts keep working after the switch.

**Frontend:**
- `src/components/admin/TestQuestionDialog.tsx`, `src/pages/admin/CourseBuilder.tsx`: dynamic option rows with per-option points selectors; new passing-score input in the Certification Test tab.
- `src/pages/Test.tsx`, `src/pages/Training.tsx`, `src/pages/CertificationTest.tsx`: render options from the array; single-select answering; points-aware feedback.
- `src/pages/Results.tsx`, `src/pages/admin/TestAttempts.tsx`, `src/components/admin/UserProfileSheet.tsx`: show points earned/possible and the course's passing percentage.
