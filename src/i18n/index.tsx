import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import pl from "./pl";

export type Lang = "en" | "pl";

export const LANGS: Lang[] = ["en", "pl"];
const STORAGE_KEY = "lnrads_lang";

const dictionaries: Record<Lang, Record<string, string>> = { en: {}, pl };

/** Removes a leading `/pl` from a pathname, always returning a path with a leading slash. */
export function stripLangPrefix(pathname: string): string {
  const stripped = pathname.replace(/^\/pl(?=\/|$)/, "");
  return stripped === "" ? "/" : stripped;
}

/** Language implied by a pathname. */
export function langFromPath(pathname: string): Lang {
  return /^\/pl(\/|$)/.test(pathname) ? "pl" : "en";
}

/** Prefixes a path with the language segment (English keeps the bare path). */
export function localizePath(path: string, lang: Lang): string {
  const base = stripLangPrefix(path.startsWith("/") ? path : `/${path}`);
  if (lang === "en") return base;
  return base === "/" ? "/pl" : `/pl${base}`;
}

interface LanguageContextValue {
  lang: Lang;
  t: (text: string) => string;
  /** Prefixes an app path with the current language. */
  lp: (path: string) => string;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  t: (text) => text,
  lp: (path) => path,
  setLang: () => {},
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const lang = langFromPath(location.pathname);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage may be unavailable */
    }
  }, [lang]);

  const t = useCallback(
    (text: string) => dictionaries[lang][text] ?? text,
    [lang],
  );

  const lp = useCallback((path: string) => localizePath(path, lang), [lang]);

  const setLang = useCallback(
    (next: Lang) => {
      if (next === lang) return;
      navigate(
        `${localizePath(location.pathname, next)}${location.search}${location.hash}`,
      );
    },
    [lang, location.hash, location.pathname, location.search, navigate],
  );

  const value = useMemo(() => ({ lang, t, lp, setLang }), [lang, t, lp, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

/** Full language context: `{ lang, t, lp, setLang }`. */
export const useLanguage = () => useContext(LanguageContext);

/** Translation helper keyed by the English source string. */
export const useT = () => useContext(LanguageContext).t;

/** Current language ("en" | "pl"). */
export const useLang = () => useContext(LanguageContext).lang;

/** Language-aware path builder for internal links. */
export const useLocalizedPath = () => useContext(LanguageContext).lp;

/** Language remembered from a previous visit, if any. */
export function storedLang(): Lang | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "pl" || value === "en" ? value : null;
  } catch {
    return null;
  }
}
