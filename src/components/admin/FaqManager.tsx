import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, HelpCircle, Loader2, Plus, Save, Trash2 } from 'lucide-react';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  question_pl?: string | null;
  answer_pl?: string | null;
  order_index: number;
  is_published: boolean;
};

const FaqManager = () => {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  const load = async () => {
    const { data, error } = await supabase
      .from('faq_items')
      .select('id, question, answer, question_pl, answer_pl, order_index, is_published')
      .order('order_index', { ascending: true });
    if (error) {
      toast.error(`Could not load FAQ: ${error.message}`);
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const patch = (id: string, changes: Partial<FaqItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next.map((i, idx) => ({ ...i, order_index: idx + 1 })));
  };

  const addItem = async () => {
    const question = newQuestion.trim();
    const answer = newAnswer.trim();
    if (!question || !answer) {
      toast.error('Question and answer are both required.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('faq_items').insert({
      question,
      answer,
      order_index: items.length + 1,
    });
    setSaving(false);
    if (error) {
      toast.error(`Could not add question: ${error.message}`);
      return;
    }
    setNewQuestion('');
    setNewAnswer('');
    toast.success('Question added.');
    load();
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from('faq_items').delete().eq('id', id);
    if (error) {
      toast.error(`Could not delete: ${error.message}`);
      return;
    }
    toast.success('Question deleted.');
    setItems((prev) =>
      prev.filter((i) => i.id !== id).map((i, idx) => ({ ...i, order_index: idx + 1 })),
    );
  };

  const saveAll = async () => {
    const invalid = items.find((i) => !i.question.trim() || !i.answer.trim());
    if (invalid) {
      toast.error('Every question needs a question and an answer.');
      return;
    }
    setSaving(true);
    const results = await Promise.all(
      items.map((item, idx) =>
        supabase
          .from('faq_items')
          .update({
            question: item.question.trim(),
            answer: item.answer.trim(),
            question_pl: (item.question_pl || '').trim() || null,
            answer_pl: (item.answer_pl || '').trim() || null,
            order_index: idx + 1,
            is_published: item.is_published,
          })
          .eq('id', item.id),
      ),
    );
    setSaving(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error(`Save failed: ${failed.error.message}`);
      return;
    }
    toast.success('FAQ saved.');
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          FAQ Editor
        </CardTitle>
        <Button onClick={saveAll} disabled={saving || loading}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Questions appear on the public FAQ page in this order. Unpublished questions stay hidden
          from visitors.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">No questions yet — add the first one below.</p>
            )}
            {items.map((item, index) => (
              <div key={item.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="mt-2 text-sm font-medium text-muted-foreground w-6 shrink-0">
                    {index + 1}.
                  </span>
                  <Input
                    value={item.question}
                    onChange={(e) => patch(item.id, { question: e.target.value })}
                    placeholder="Question"
                    maxLength={300}
                  />
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Move question up"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Move question down"
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Delete question"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={item.answer}
                  onChange={(e) => patch(item.id, { answer: e.target.value })}
                  placeholder="Answer"
                  rows={3}
                  maxLength={2000}
                />
                <div className="space-y-2 rounded-lg border border-dashed p-3 bg-muted/20">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Polish version (optional)
                  </p>
                  <Input
                    value={item.question_pl || ''}
                    onChange={(e) => patch(item.id, { question_pl: e.target.value })}
                    placeholder="Pytanie (PL)"
                    maxLength={300}
                  />
                  <Textarea
                    value={item.answer_pl || ''}
                    onChange={(e) => patch(item.id, { answer_pl: e.target.value })}
                    placeholder="Odpowiedź (PL)"
                    rows={3}
                    maxLength={2000}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`published-${item.id}`}
                    checked={item.is_published}
                    onCheckedChange={(checked) => patch(item.id, { is_published: checked })}
                  />
                  <Label htmlFor={`published-${item.id}`} className="text-sm text-muted-foreground">
                    Published
                  </Label>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-dashed p-4 space-y-3">
          <h3 className="text-sm font-semibold">Add a new question</h3>
          <Input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Question"
            maxLength={300}
          />
          <Textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Answer"
            rows={3}
            maxLength={2000}
          />
          <Button variant="secondary" onClick={addItem} disabled={saving}>
            <Plus className="h-4 w-4" />
            Add question
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FaqManager;
