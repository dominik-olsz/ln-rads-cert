# Fix: question zoom still swipes into the next question's images

The scoping fix is in the source already, but the preview is serving a stale compiled copy of the training page: the module the browser downloads still calls the old, unscoped open-viewer code. That is why swiping still walks into the next question's images.

## Plan

1. Flush the stale preview build (restart the dev server so the training page is re-compiled).
2. Confirm the served module now contains the scoped call.
3. Verify in a browser run on a Use Cases page with two questions: opening an image of question 1 shows a "1 / 2" counter and swiping stops at that question's two images, never reaching question 2's image.
4. If the served code is correct but behaviour persists, fix the actual scoping path found during that check.

No database or backend changes.
