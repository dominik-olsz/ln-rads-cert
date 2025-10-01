import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestQuestion {
  id?: string;
  course_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  difficulty: string;
  explanation?: string;
}

interface TestQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question?: TestQuestion | null;
  onSuccess: () => void;
}

const TestQuestionDialog = ({ open, onOpenChange, question, onSuccess }: TestQuestionDialogProps) => {
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [courseId, setCourseId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (question) {
      setCourseId(question.course_id);
      setQuestionText(question.question_text);
      setOptionA(question.option_a);
      setOptionB(question.option_b);
      setOptionC(question.option_c);
      setOptionD(question.option_d);
      setCorrectAnswer(question.correct_answer);
      setDifficulty(question.difficulty || 'medium');
      setExplanation(question.explanation || '');
    } else {
      setCourseId('');
      setQuestionText('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setCorrectAnswer('');
      setDifficulty('medium');
      setExplanation('');
    }
  }, [question, open]);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .order('title');
    if (data) setCourses(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const questionData = {
        course_id: courseId,
        question_text: questionText,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_answer: correctAnswer,
        difficulty,
        explanation: explanation || null,
      };

      if (question?.id) {
        const { error } = await supabase
          .from('test_questions')
          .update(questionData)
          .eq('id', question.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Question updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('test_questions')
          .insert(questionData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Question created successfully',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: 'Error',
        description: 'Failed to save question',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? 'Edit Question' : 'Add Question'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="course">Course</Label>
            <Select value={courseId} onValueChange={setCourseId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="questionText">Question</Label>
            <Textarea
              id="questionText"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="optionA">Option A</Label>
              <Input
                id="optionA"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="optionB">Option B</Label>
              <Input
                id="optionB"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="optionC">Option C</Label>
              <Input
                id="optionC"
                value={optionC}
                onChange={(e) => setOptionC(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="optionD">Option D</Label>
              <Input
                id="optionD"
                value={optionD}
                onChange={(e) => setOptionD(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="correctAnswer">Correct Answer</Label>
              <Select value={correctAnswer} onValueChange={setCorrectAnswer} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select correct answer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="explanation">Explanation (Optional)</Label>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : question ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TestQuestionDialog;
