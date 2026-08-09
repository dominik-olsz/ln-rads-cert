import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  QuestionOption,
  optionLetter,
} from "@/lib/questionOptions";

interface QuestionOptionsEditorProps {
  options: QuestionOption[];
  onChange: (options: QuestionOption[]) => void;
}

const QuestionOptionsEditor = ({ options, onChange }: QuestionOptionsEditorProps) => {
  const update = (index: number, patch: Partial<QuestionOption>) => {
    onChange(options.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    onChange([...options, { text: "", points: 0 }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= MIN_OPTIONS) return;
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Answer options</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addOption}
          disabled={options.length >= MAX_OPTIONS}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add option
        </Button>
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-5 text-sm font-medium text-muted-foreground">
              {optionLetter(index)}
            </span>
            <Input
              value={option.text}
              onChange={(e) => update(index, { text: e.target.value })}
              placeholder={`Option ${optionLetter(index)}`}
              className="flex-1"
            />
            <Select
              value={String(option.points)}
              onValueChange={(value) =>
                update(index, { points: Number(value) as 0 | 1 | 2 })
              }
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">Correct (2 pts)</SelectItem>
                <SelectItem value="1">Semi-correct (1 pt)</SelectItem>
                <SelectItem value="0">Wrong (0 pts)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeOption(index)}
              disabled={options.length <= MIN_OPTIONS}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Students pick one option. You can mark several options as correct or semi-correct.
        At least one option must be Correct.
      </p>
    </div>
  );
};

export default QuestionOptionsEditor;
