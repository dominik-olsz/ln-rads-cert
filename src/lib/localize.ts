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

/**
 * Copies non-blank `<field>_<lang>` values over their base fields so existing
 * rendering code keeps reading `title`, `description`, … unchanged.
 * `options` is handled with the length-safe rule above.
 */
export function localizeRow<T extends Record<string, any>>(
  row: T | null | undefined,
  fields: string[],
  lang: Lang,
): T {
  if (!row) return row as T;
  if (lang === "en") return row;
  const out: Record<string, any> = { ...row };
  for (const field of fields) {
    const value = pickField(row, field, lang);
    if (value !== undefined) out[field] = value;
  }
  if (fields.includes("options")) out.options = pickOptions(row as any, lang);
  return out as T;
}

/** Array flavour of {@link localizeRow}. */
export function localizeRows<T extends Record<string, any>>(
  rows: T[] | null | undefined,
  fields: string[],
  lang: Lang,
): T[] {
  return (rows ?? []).map((row) => localizeRow(row, fields, lang));
}

export const COURSE_FIELDS = ["title", "description", "course_includes", "what_you_learn"];
export const LESSON_FIELDS = ["title", "content_text"];
export const MATERIAL_FIELDS = ["title", "explanation"];
export const QUESTION_FIELDS = ["question_text", "explanation", "group_title", "options"];
export const FAQ_FIELDS = ["question", "answer"];
