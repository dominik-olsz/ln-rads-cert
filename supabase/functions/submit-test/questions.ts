export type QuestionOption = { text: string; points: 0 | 1 | 2 };

export const MAX_POINTS_PER_QUESTION = 2;

/** Read the `options` jsonb column, falling back to the legacy A-D shape. */
export const normalizeOptions = (row: any): QuestionOption[] => {
  const raw = row?.options;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((o: any) => ({
      text: String(o?.text ?? ''),
      points: (o?.points === 2 ? 2 : o?.points === 1 ? 1 : 0) as 0 | 1 | 2,
    }));
  }

  const letters = ['A', 'B', 'C', 'D'];
  const correct = String(row?.correct_answer ?? '').trim().charAt(0).toUpperCase();
  return [row?.option_a, row?.option_b, row?.option_c, row?.option_d]
    .map((text, i) => ({
      text: String(text ?? ''),
      points: (letters[i] === correct ? 2 : 0) as 0 | 1 | 2,
    }))
    .filter((o) => o.text.trim() !== '');
};

/** Options without the answer key, safe to send to the browser. */
export const publicOptions = (row: any) =>
  normalizeOptions(row).map((o) => ({ text: o.text }));

/**
 * Resolve a submitted answer to an option index.
 * Accepts a numeric index ("0", 2) or a legacy letter ("A".."D").
 */
export const resolveAnswerIndex = (answer: unknown): number => {
  if (typeof answer === 'number' && Number.isInteger(answer)) return answer;
  const value = String(answer ?? '').trim();
  if (/^\d+$/.test(value)) return Number(value);
  const letter = value.charAt(0).toUpperCase();
  const idx = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].indexOf(letter);
  return idx;
};

export const pointsForAnswer = (row: any, answer: unknown): number => {
  const options = normalizeOptions(row);
  const idx = resolveAnswerIndex(answer);
  if (idx < 0 || idx >= options.length) return 0;
  return options[idx].points;
};

export const correctIndexes = (row: any): number[] =>
  normalizeOptions(row)
    .map((o, i) => (o.points === 2 ? i : -1))
    .filter((i) => i >= 0);

export const semiCorrectIndexes = (row: any): number[] =>
  normalizeOptions(row)
    .map((o, i) => (o.points === 1 ? i : -1))
    .filter((i) => i >= 0);
