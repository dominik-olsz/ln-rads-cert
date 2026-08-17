import { cn } from "@/lib/utils";
import { LANGS, useLanguage } from "@/i18n";

const labels: Record<string, string> = { en: "EN", pl: "PL" };

/** Compact EN / PL switcher that keeps the visitor on the current page. */
const LanguageSwitcher = ({ className }: { className?: string }) => {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl border border-border/60 p-0.5",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-current={lang === code ? "true" : undefined}
          className={cn(
            "px-2 py-1 text-xs font-semibold rounded-lg transition-colors",
            lang === code
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {labels[code] ?? code.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
