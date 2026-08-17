import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import LegalPage from "@/components/LegalPage";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n";
import { LEGAL_DEFAULTS, LegalSlug } from "@/content/legalDefaults";

interface LegalDocumentProps {
  slug: LegalSlug;
  seoTitle: string;
  seoDescription: string;
}

interface LegalRow {
  title_en: string;
  title_pl: string;
  subtitle_en: string;
  subtitle_pl: string;
  body_en: string;
  body_pl: string;
  last_updated_en: string;
  last_updated_pl: string;
}

/** Renders a legal document from the database, falling back to the bundled text. */
const LegalDocument = ({ slug, seoTitle, seoDescription }: LegalDocumentProps) => {
  const { lang } = useLanguage();
  const [row, setRow] = useState<LegalRow | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("legal_documents")
      .select(
        "title_en, title_pl, subtitle_en, subtitle_pl, body_en, body_pl, last_updated_en, last_updated_pl",
      )
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setRow(data as LegalRow);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const fallback = LEGAL_DEFAULTS[slug][lang] ?? LEGAL_DEFAULTS[slug].en;
  const pick = (pl: string | undefined, en: string | undefined, def: string) => {
    const value = lang === "pl" ? pl || "" : en || "";
    return value.trim() ? value : def;
  };

  const title = pick(row?.title_pl, row?.title_en, fallback.title);
  const subtitle = pick(row?.subtitle_pl, row?.subtitle_en, fallback.subtitle);
  const lastUpdated = pick(row?.last_updated_pl, row?.last_updated_en, fallback.lastUpdated);
  const body = pick(row?.body_pl, row?.body_en, fallback.body);

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} path={`/${slug}`} />
      <LegalPage title={title} subtitle={subtitle} lastUpdated={lastUpdated}>
        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:leading-relaxed [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:leading-relaxed [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          <ReactMarkdown>{body}</ReactMarkdown>
        </div>
      </LegalPage>
    </>
  );
};

export default LegalDocument;
