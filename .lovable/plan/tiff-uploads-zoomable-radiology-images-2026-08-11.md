# TIFF uploads + zoomable radiology images

## Goal
1. Admin can upload `.tif` / `.tiff` radiology images anywhere images are uploaded in the course builder (Course Content tab, Certification Test tab, lesson rich text, hero image, materials).
2. Students can click any image (lesson content, materials, practice questions, certification test) to open a zoomable viewer.

## 1. TIFF upload support
Browsers cannot render TIFF, so each TIFF is decoded in the browser and converted to a lossless PNG before upload.

- Add a small helper `src/lib/imageUpload.ts`:
  - `prepareImageForUpload(file)` — if the file is TIFF (extension or MIME), decode it with the `utif` library, draw it to a canvas and return a new PNG `File`; otherwise return the file unchanged.
  - Handles multi-page TIFFs by using the first page, and surfaces a clear error for unsupported/compressed variants that cannot be decoded.
- Route every image upload through this helper, and extend the file pickers' `accept` to include `.tif,.tiff`:
  - Course Builder: hero image, question images in the Course Content tab, question images in the Certification Test tab.
  - `RichTextEditor` (drag/drop, paste and toolbar image button).
  - `TestQuestionDialog` and `CourseMaterialDialog`.
- Show a short "Converting image…" state while a large TIFF is being decoded.

## 2. Zoomable image viewer
Add a reusable `src/components/ImageLightbox.tsx` (dialog-based) with:
- Cursor-anchored wheel/trackpad zoom (delta-normalised, non-passive wheel listener), pinch on touch, drag to pan.
- `+` / `−` / reset buttons, close button, `Esc` to close, double-click to toggle fit/zoom.
- Zoom range roughly 1x–8x, image rendered at full resolution.

Wire it up so clicking an image opens it:
- `Training.tsx` — replaces the current basic full-size dialog; also applies to lesson rich-text images, materials images and practice question images.
- `CertificationTest.tsx` — question images become clickable.
- `Test.tsx` — question images become clickable.
- `CourseDetail.tsx` — lesson preview images.
- Admin previews in Course Builder / dialogs also open the viewer, so admins can verify uploaded detail.

## Technical notes
- New dependency: `utif` (small, pure-JS TIFF decoder).
- Existing image records and URLs are untouched; conversion only affects new uploads.
- Lesson rich-text images get click handling via a delegated click listener on the rendered content container (no HTML rewriting).
- No database or edge function changes required.
