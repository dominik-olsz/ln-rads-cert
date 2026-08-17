import type { Lang } from "@/i18n";

/**
 * Returns the localized value of a field, falling back to the English column
 * whenever the translation is missing or blank. Fields follow the `<name>_pl`
 * naming convention in the database.
 */
export function pickField<T extends Record<string, any>>(
  row: T | null | undefined,
  field: string,
  lang: Lang,
): any {
  if (!row) return undefined;
  if (lang !== "en") {
    const translated = row[`${field}_${lang}`];
    if (typeof translated === "string" ? translated.trim() !== "" : translated != null) {
      return translated;
    }
  }
  return row[field];
}

/** String flavour of {@link pickField}. */
export function pickText<T extends Record<string, any>>(
  row: T | null | undefined,
  field: string,
  lang: Lang,
): string {
  const value = pickField(row, field, lang);
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

/**
 * Localizes answer options. Polish options are only used when they exist and
 * have the same length as the English ones, so scoring can never shift.
 */
export function pickOptions(
  row: { options?: any; options_pl?: any } | null | undefined,
  lang: Lang,
): any[] {
  const base = Array.isArray(row?.options) ? row!.options : [];
  if (lang === "en") return base;
  const translated = Array.isArray(row?.options_pl) ? row!.options_pl : null;
  if (!translated || translated.length !== base.length) return base;
  return base.map((option: any, index: number) => {
    const t = translated[index] ?? {};
    const text = typeof t === "string" ? t : t?.text;
    return text && String(text).trim() !== "" ? { ...option, text } : option;
  });
}
