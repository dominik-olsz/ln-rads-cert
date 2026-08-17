import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import QuestionOptionsEditor from '@/components/admin/QuestionOptionsEditor';
import { IMAGE_UPLOAD_ACCEPT, prepareImageForUpload } from '@/lib/imageUpload';
import PolishQuestionFields, { PolishOption } from '@/components/admin/PolishQuestionFields';
import {
  QuestionOption,
  emptyOptions,
  compactOptions,
  isValidQuestionOptions,
  normalizeOptions,
} from '@/lib/questionOptions';

interface TestQuestion {
  id?: string;
  course_id: string;
  question_text: string;
  options?: unknown;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  correct_answer?: string | null;
  question_text_pl?: string | null;
  options_pl?: unknown;
  explanation_pl?: string | null;
  explanation?: string;
  image_url?: string;
  image_urls?: string[] | null;
  test_type?: 'course' | 'certification';
}

interface TestQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question?: TestQuestion | null;
  onSuccess: () => void;
  testType?: 'course' | 'certification';
}

const TestQuestionDialog = ({ open, onOpenChange, question, onSuccess, testType = 'certification' }: TestQuestionDialogProps) => {
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [courseId, setCourseId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<QuestionOption[]>(emptyOptions());
  const [explanation, setExplanation] = useState('');
  const [questionTextPl, setQuestionTextPl] = useState('');
  const [explanationPl, setExplanationPl] = useState('');
  const [optionsPl, setOptionsPl] = useState<PolishOption[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (question) {
      setCourseId(question.course_id);
      setQuestionText(question.question_text);
      setOptions(normalizeOptions(question.options, question));
      setExplanation(question.explanation || '');
      setQuestionTextPl(question.question_text_pl || '');
      setExplanationPl(question.explanation_pl || '');
      setOptionsPl(Array.isArray(question.options_pl) ? (question.options_pl as PolishOption[]) : []);
      setImageUrls(question.image_urls?.length ? question.image_urls : question.image_url ? [question.image_url] : []);
    } else {
      setCourseId('');
      setQuestionText('');
      setOptions(emptyOptions());
      setExplanation('');
      setQuestionTextPl('');
      setExplanationPl('');
      setOptionsPl([]);
      setImageUrls([]);
    }
  }, [question, open]);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .order('title');
    if (data) setCourses(data);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const input = e.target;

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const prepared = await prepareImageForUpload(file);
        const fileExt = prepared.name.split('.').pop();
        const filePath = `question-images/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('course-materials')
          .upload(filePath, prepared);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('course-materials')
          .getPublicUrl(filePath);
        uploaded.push(data.publicUrl);
      }

      setImageUrls((prev) => [...prev, ...uploaded]);
      input.value = '';
      toast({
        title: 'Success',
        description: 'Images uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedOptions = compactOptions(options);

    if (!isValidQuestionOptions(cleanedOptions)) {
      toast({
        title: 'Check the answer options',
        description: 'Fill in at least two options and mark one as Correct (2 points).',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const questionData = {
        course_id: courseId || null,
        question_text: questionText,
        options: cleanedOptions as unknown as any,
        option_a: null,
        option_b: null,
        option_c: null,
        option_d: null,
        correct_answer: null,
        explanation: explanation || null,
        question_text_pl: questionTextPl.trim() || null,
        explanation_pl: explanationPl.trim() || null,
        options_pl: (optionsPl.some((o) => (o?.text || '').trim() !== '')
          ? optionsPl
          : null) as unknown as any,
        image_url: imageUrls[0] || null,
        image_urls: imageUrls,
        test_type: question?.test_type || testType,
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
          {testType !== 'certification' && (
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
          )}

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

          <QuestionOptionsEditor options={options} onChange={setOptions} />

          <div>
            <Label htmlFor="image">Question Images (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="image"
                type="file"
                multiple
                accept={IMAGE_UPLOAD_ACCEPT}
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading && <span className="text-sm text-muted-foreground">Converting & uploading...</span>}
            </div>
            {imageUrls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {imageUrls.map((url, i) => (
                  <div key={url} className="relative">
                    <img src={url} alt="Question" className="h-24 w-24 object-cover rounded border" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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

          <PolishQuestionFields
            options={options}
            value={{
              question_text_pl: questionTextPl,
              explanation_pl: explanationPl,
              options_pl: optionsPl,
            }}
            onChange={(patch) => {
              if (patch.question_text_pl !== undefined) setQuestionTextPl(patch.question_text_pl);
              if (patch.explanation_pl !== undefined) setExplanationPl(patch.explanation_pl);
              if (patch.options_pl !== undefined) setOptionsPl(patch.options_pl);
            }}
          />

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
