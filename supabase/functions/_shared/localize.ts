/**
 * Server-side content localization. Translations live in `<field>_pl` columns;
 * a missing or blank translation always falls back to the English column, so a
 * partially translated course can never render empty.
 */

export type Lang = "en" | "pl";

export const parseLang = (value: unknown): Lang => (value === "pl" ? "pl" : "en");

const filled = (value: unknown) =>
  typeof value === "string" ? value.trim() !== "" : value != null;

/** Copies non-blank `<field>_<lang>` values over their base fields. */
export function localizeRow<T extends Record<string, any>>(
  row: T | null | undefined,
  fields: string[],
  lang: Lang,
): T {
  if (!row) return row as T;
  if (lang === "en") return row;
  const out: Record<string, any> = { ...row };
  for (const field of fields) {
    const translated = row[`${field}_${lang}`];
    if (filled(translated)) out[field] = translated;
  }
  return out as T;
}

/**
 * Localizes answer options. The translated array is only used when it has the
 * same length as the English one, so points and ordering can never shift.
 */
export function localizeOptions(row: any, lang: Lang): any[] | undefined {
  const base = Array.isArray(row?.options) ? row.options : undefined;
  if (lang === "en" || !base) return base;
  const translated = Array.isArray(row?.options_pl) ? row.options_pl : null;
  if (!translated || translated.length !== base.length) return base;
  return base.map((option: any, index: number) => {
    const t = translated[index];
    const text = typeof t === "string" ? t : t?.text;
    return filled(text) ? { ...option, text } : option;
  });
}

/** Full localization of a `test_questions` row (text, explanation, options). */
export function localizeQuestion(row: any, lang: Lang): any {
  if (lang === "en" || !row) return row;
  const localized = localizeRow(row, ["question_text", "explanation", "group_title"], lang);
  const options = localizeOptions(row, lang);
  return options ? { ...localized, options } : localized;
}
