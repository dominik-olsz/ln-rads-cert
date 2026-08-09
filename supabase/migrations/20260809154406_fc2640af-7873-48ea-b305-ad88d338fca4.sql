ALTER TABLE public.course_purchases
  ADD COLUMN IF NOT EXISTS granted_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS granted_by uuid;