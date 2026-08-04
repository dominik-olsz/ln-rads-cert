ALTER TABLE public.course_purchases
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

CREATE UNIQUE INDEX IF NOT EXISTS course_purchases_stripe_session_id_key
  ON public.course_purchases (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.course_purchases;

GRANT SELECT ON public.course_purchases TO authenticated;
GRANT ALL ON public.course_purchases TO service_role;