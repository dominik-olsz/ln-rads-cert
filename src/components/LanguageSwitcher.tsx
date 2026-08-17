import { cn } from "@/lib/utils";
import { LANGS, useLanguage } from "@/i18n";

const flags: Record<string, string> = { en: "🇬🇧", pl: "🇵🇱" };
const labels: Record<string, string> = { en: "English", pl: "Polski" };

/** Single flag switcher showing the language you can switch to. */
const LanguageSwitcher = ({ className }: { className?: string }) => {
  const { lang, setLang } = useLanguage();
  const otherLang = LANGS.find((code) => code !== lang) ?? LANGS[0];

  return (
    <div className={cn("inline-flex items-center", className)} aria-label="Language">
      <button
        type="button"
        onClick={() => setLang(otherLang)}
        aria-label={labels[otherLang]}
        title={labels[otherLang]}
        className="text-xl leading-none opacity-90 hover:opacity-100 transition-opacity"
      >
        {flags[otherLang]}
      </button>
    </div>
  );
};

export default LanguageSwitcher;
