CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete settings" ON public.app_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value) VALUES ('certification_retake_price', '6900'::jsonb);

CREATE TABLE public.certification_retake_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_paid integer NOT NULL DEFAULT 0,
  stripe_session_id text UNIQUE,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.certification_retake_purchases TO authenticated;
GRANT ALL ON public.certification_retake_purchases TO service_role;

ALTER TABLE public.certification_retake_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own retake purchases" ON public.certification_retake_purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all retake purchases" ON public.certification_retake_purchases FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete retake purchases" ON public.certification_retake_purchases FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_certification_retake_purchases_updated_at BEFORE UPDATE ON public.certification_retake_purchases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_retake_purchases_user ON public.certification_retake_purchases(user_id);