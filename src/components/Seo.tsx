import { Helmet } from "react-helmet-async";
import { localizePath, stripLangPrefix, useLang } from "@/i18n";

const SITE_URL = "https://cert.lnrads.com";
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

interface SeoProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const Seo = ({ title, description, path, noindex, jsonLd }: SeoProps) => {
  const lang = useLang();
  const basePath = stripLangPrefix(path.startsWith("/") ? path : `/${path}`);
  const url = `${SITE_URL}${localizePath(basePath, lang)}`;
  const enUrl = `${SITE_URL}${localizePath(basePath, "en")}`;
  const plUrl = `${SITE_URL}${localizePath(basePath, "pl")}`;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {!noindex && <link rel="alternate" hrefLang="en" href={enUrl} />}
      {!noindex && <link rel="alternate" hrefLang="pl" href={plUrl} />}
      {!noindex && <link rel="alternate" hrefLang="x-default" href={enUrl} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:locale" content={lang === "pl" ? "pl_PL" : "en_GB"} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default Seo;
