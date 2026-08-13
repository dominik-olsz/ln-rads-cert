# Scope the image viewer to one question

Right now tapping a question image in a lesson's Use Cases opens the viewer with every image rendered in the content area (lesson body, materials, and all questions on the page). Swiping then moves through unrelated images.

## Change

- Give the image viewer an optional "scope" when opening it.
- Question images open with only that question's own images (its `image_urls`, or the single legacy `image_url`), with the tapped one as the starting slide.
- Lesson body / materials images keep the current behaviour: all images in the lesson content area, in visual order.
- Same scoping applied on the certification test page so each question is self-contained there too.

## Technical notes

- `src/pages/Training.tsx`: extend `openLightbox` to accept an explicit image list; when a question image is clicked, pass that question's normalized image array plus the clicked index instead of scanning the DOM.
- `src/pages/CertificationTest.tsx`: verify/align question image clicks to pass only that question's images.
- No backend or data changes.
