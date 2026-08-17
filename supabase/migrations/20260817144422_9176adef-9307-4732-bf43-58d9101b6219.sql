CREATE TABLE public.legal_documents (
  slug text PRIMARY KEY,
  title_en text NOT NULL DEFAULT '',
  title_pl text NOT NULL DEFAULT '',
  subtitle_en text NOT NULL DEFAULT '',
  subtitle_pl text NOT NULL DEFAULT '',
  body_en text NOT NULL DEFAULT '',
  body_pl text NOT NULL DEFAULT '',
  last_updated_en text NOT NULL DEFAULT '',
  last_updated_pl text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.legal_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_documents TO authenticated;
GRANT ALL ON public.legal_documents TO service_role;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Legal documents are publicly readable"
  ON public.legal_documents FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert legal documents"
  ON public.legal_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update legal documents"
  ON public.legal_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete legal documents"
  ON public.legal_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.legal_documents (slug) VALUES ('privacy-policy'), ('terms');