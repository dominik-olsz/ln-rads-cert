# Question images: one main image with a thumbnail carousel

Today all images of a question are stacked full-width. Change it so a question with several images shows one large image plus a small row of thumbnails underneath.

## Behaviour

- One image: unchanged (single large image, tap to zoom).
- Several images: first image shown as the main image; a horizontally scrollable strip of small thumbnails below it.
- Tapping a thumbnail makes it the main image; the active thumbnail is highlighted.
- Tapping the main image opens the zoom viewer starting on that image, still scoped to this question's images only (swipe stays within the question).

## Technical notes

- Add a small reusable `QuestionImages` component that holds the selected index locally and renders main image + thumbnail strip, calling back on main-image click for the lightbox.
- Use it for question images in `src/pages/Training.tsx` (Use Cases) and `src/pages/CertificationTest.tsx` so both look and behave the same.
- Styling uses existing design tokens; no database or backend changes.
