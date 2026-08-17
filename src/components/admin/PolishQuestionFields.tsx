import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionOption } from "@/lib/questionOptions";

export type PolishOption = { text: string };

export interface PolishQuestionValue {
  question_text_pl?: string;
  explanation_pl?: string;
  options_pl?: PolishOption[];
}

/**
 * Polish translation fields for a question. Answer options are translated
 * position by position — scoring always comes from the English `options`
 * array, so a missing or mismatched translation simply falls back to English.
 */
const PolishQuestionFields = ({
  options,
  value,
  onChange,
}: {
  options: QuestionOption[];
  value: PolishQuestionValue;
  onChange: (patch: PolishQuestionValue) => void;
}) => {
  const translations = options.map((_, i) => value.options_pl?.[i]?.text ?? "");

  const setOption = (index: number, text: string) => {
    const next = options.map((_, i) => ({ text: i === index ? text : translations[i] }));
    onChange({ options_pl: next });
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3 bg-muted/20">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Polish version (optional)
      </p>

      <div className="space-y-2">
        <Label>Pytanie (PL)</Label>
        <Input
          value={value.question_text_pl || ""}
          onChange={(e) => onChange({ question_text_pl: e.target.value })}
          placeholder="Treść pytania po polsku"
        />
      </div>

      {options.length > 0 && (
        <div className="space-y-2">
          <Label>Odpowiedzi (PL)</Label>
          {options.map((option, i) => (
            <Input
              key={i}
              value={translations[i]}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={option.text ? `PL: ${option.text}` : `Odpowiedź ${i + 1}`}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label>Wyjaśnienie (PL)</Label>
        <Textarea
          value={value.explanation_pl || ""}
          onChange={(e) => onChange({ explanation_pl: e.target.value })}
          placeholder="Wyjaśnienie poprawnej odpowiedzi"
          rows={2}
        />
      </div>
    </div>
  );
};

export default PolishQuestionFields;
