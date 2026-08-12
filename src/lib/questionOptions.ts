export type QuestionOption = {
  text: string;
  points: 0 | 1 | 2;
};

export const DEFAULT_OPTION_COUNT = 6;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 8;
export const MAX_POINTS_PER_QUESTION = 2;

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export const optionLetter = (index: number) => LETTERS[index] ?? String(index + 1);

export const emptyOptions = (count = DEFAULT_OPTION_COUNT): QuestionOption[] =>
  Array.from({ length: count }, () => ({ text: "", points: 0 as const }));

type LegacyRow = {
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  correct_answer?: string | null;
};

/** Reads the `options` jsonb column, falling back to the legacy A-D columns. */
export const normalizeOptions = (raw: unknown, legacy?: LegacyRow): QuestionOption[] => {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((o: any) => ({
      text: String(o?.text ?? ""),
      points: (o?.points === 2 ? 2 : o?.points === 1 ? 1 : 0) as 0 | 1 | 2,
    }));
  }

  if (legacy) {
    const texts = [legacy.option_a, legacy.option_b, legacy.option_c, legacy.option_d];
    const correct = String(legacy.correct_answer ?? "").trim().charAt(0).toUpperCase();
    const mapped = texts
      .map((text, i) => ({
        text: String(text ?? ""),
        points: (LETTERS[i] === correct ? 2 : 0) as 0 | 1 | 2,
      }))
      .filter((o) => o.text.trim() !== "");
    if (mapped.length > 0) return mapped;
  }

  return emptyOptions();
};

/** Option texts only — what learners see (no points/answer key). */
export const displayOptions = (raw: unknown, legacy?: LegacyRow): string[] =>
  normalizeOptions(raw, legacy).map((o) => o.text);

export const isValidQuestionOptions = (options: QuestionOption[]): boolean =>
  options.length >= MIN_OPTIONS &&
  options.length <= MAX_OPTIONS &&
  options.every((o) => o.text.trim() !== "") &&
  options.some((o) => o.points === 2);

/** Drops blank option rows so partially filled option grids stay valid. */
export const compactOptions = (options: QuestionOption[]): QuestionOption[] =>
  (options ?? [])
    .filter((o) => (o?.text ?? "").trim() !== "")
    .map((o) => ({ text: o.text.trim(), points: o.points }));
