import { cn } from "@/lib/utils";
import { LANGS, useLanguage } from "@/i18n";

const flags: Record<string, string> = { en: "🇬🇧", pl: "🇵🇱" };
const labels: Record<string, string> = { en: "English", pl: "Polski" };

/** Compact flag switcher that keeps the visitor on the current page. */
const LanguageSwitcher = ({ className }: { className?: string }) => {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl border border-border/60 p-1",
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
          aria-label={labels[code]}
          title={labels[code]}
          className={cn(
            "text-lg leading-none px-1.5 py-1 rounded-lg transition-colors",
            lang === code
              ? "bg-foreground/10"
              : "opacity-60 hover:opacity-100",
          )}
        >
          {flags[code]}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
