# Fix swiping between lesson images

## What's happening

This lesson's 4 images live inside the lesson's rich-text body (confirmed: the lesson has 4 images embedded in its HTML content and no image materials).

The lightbox itself already supports swiping and arrows, but the code that decides *which* images to hand it only looks at:
- the lesson's single main image, and
- image files attached as "Additional Materials".

Images inside the rich text are never collected, so tapping one opens the viewer with just that one image and nothing to swipe to.

## The fix

When an image is tapped, gather every image actually shown in the lesson view, in the order it appears on screen — including the ones embedded in the rich text — and open the viewer at the tapped image's position.

Result on mobile: tapping any of the 4 images opens the viewer showing "1 / 4" and you can swipe left/right (or use the arrows) through all of them.

## Technical notes

- `src/pages/Training.tsx`: rewrite `openLightbox` to read the images from the rendered content container (`contentRef`) via `querySelectorAll('img')`, mapping to `currentSrc || src` so the list matches what the browser actually loaded. Locate the tapped image by element identity first, falling back to src match, then to a single-image list.
- Keep the existing question-group behaviour (test question images) working by using the same DOM-based collection, which already covers those images since they render inside the same container.
- No change needed in `src/components/ImageLightbox.tsx` — swipe, arrows and the "n / total" counter already work once it receives the full array.
