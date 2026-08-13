# Swipe left/right to move between course items on mobile

## What you get

On the training page, on phones/tablets you can swipe horizontally across the lesson content area to move between course items:

- Swipe left -> next item (same as the Next button)
- Swipe right -> previous item (same as Previous)
- The content card follows your finger slightly and settles back, so the gesture feels responsive
- Swipes are ignored at the first/last item, and when the swipe is mostly vertical (normal page scrolling stays untouched)
- After a swipe, the view scrolls to the top of the new lesson/question section, exactly like the Previous/Next buttons do today
- The Previous/Next buttons stay visible and unchanged; desktop behaviour is unchanged

## Guardrails

- Swipes that start on an image, video, iframe, or an answer option are ignored, so opening the image viewer, tapping answers and using the video player keep working. The image viewer keeps its own swipe-between-images behaviour.

## Technical notes

- `src/pages/Training.tsx`: add pointer handlers (`onPointerDown` / `onPointerMove` / `onPointerUp` / `onPointerCancel`) on the left content column wrapper, gated to `pointerType !== 'mouse'`.
- Track start x/y and time; commit navigation when horizontal distance > ~60px (or > ~35px with velocity > 0.4 px/ms) and `|dx| > |dy| * 1.5`. Commit by calling the existing `handlePrevious` / `handleNext` so progress saving and scroll-to-content stay identical.
- Apply a small live `translateX` (capped, e.g. +/-40px) to the content card while dragging, removed on release with a short transition.
- Bail out when the pointer target is inside `img`, `video`, `iframe`, or `[role="radio"]` (`closest()` check). No changes to `ImageLightbox.tsx`.
