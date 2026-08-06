ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS buyer_type text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS vat_id text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_buyer_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_buyer_type_check CHECK (buyer_type IN ('private','company'));