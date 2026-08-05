# Remove redundant "Grants Certification Test Access" toggle

The "Grants Certification Test Access" checkbox in the course Basic Info tab duplicates the "This course has a certification test" toggle in the Certification Test tab. We will remove the redundant UI and migrate all logic to use `certification_enabled`.

## What will change

1. **Admin Course Builder**
   - Remove the "Grants Certification Test Access" checkbox and its helper text from the Basic Info tab.
   - Remove the `grantsCertificationAccess` state and stop saving it to the `courses` table.
   - The existing "Certification Test" tab toggle (`certification_enabled`) becomes the single source of truth.

2. **Public course listing / detail / test flow**
   - Replace every read of `grants_certification_access` with `certification_enabled`:
     - `src/pages/Courses.tsx` and `src/components/CourseCard.tsx` (certification badge on course cards).
     - `src/pages/CourseDetail.tsx` (certification badge and "Take Certification Test" button).
     - `src/pages/CertificationTest.tsx` (query that finds qualifying purchases).
   - Rename the `CourseCard` prop from `grantsCertification` to `certificationEnabled` to match the source field.

3. **Database**
   - Drop the now-unused `grants_certification_access` column from the `courses` table.
   - Regenerate Supabase types so TypeScript reflects the new schema.

## Result

Admins configure certification availability in one place only: the Certification Test tab. The public UI and certification gate continue to work, driven by the same `certification_enabled` flag.
