-- Make course-materials bucket publicly readable and restrict writes to admins
-- 1) Ensure the bucket is public
update storage.buckets set public = true where id = 'course-materials';

-- 2) Public read access for course images
create policy "Public read access for course materials"
  on storage.objects
  for select
  using (bucket_id = 'course-materials');

-- 3) Admins can upload images
create policy "Admins can upload course materials"
  on storage.objects
  for insert
  with check (
    bucket_id = 'course-materials' and public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 4) Admins can update images
create policy "Admins can update course materials"
  on storage.objects
  for update
  using (
    bucket_id = 'course-materials' and public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 5) Admins can delete images
create policy "Admins can delete course materials"
  on storage.objects
  for delete
  using (
    bucket_id = 'course-materials' and public.has_role(auth.uid(), 'admin'::app_role)
  );