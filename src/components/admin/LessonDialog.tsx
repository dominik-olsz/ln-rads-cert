import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchLessonContent } from '@/lib/lessonContent';

interface Lesson {
  id?: string;
  course_id: string;
  title: string;
  order_index: number;
  content_type: string;
  content_text?: string;
  content_url?: string;
  duration?: string;
}

interface LessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: Lesson | null;
  courseId: string;
  onSuccess: () => void;
}

const LessonDialog = ({ open, onOpenChange, lesson, courseId, onSuccess }: LessonDialogProps) => {
  const [title, setTitle] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [contentType, setContentType] = useState('video');
  const [contentText, setContentText] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    if (lesson) {
      setTitle(lesson.title);
      setOrderIndex(lesson.order_index);
      setContentType(lesson.content_type);
      setDuration(lesson.duration || '');
      setContentText('');
      setContentUrl('');
    } else {
      setTitle('');
      setOrderIndex(1);
      setContentType('video');
      setContentText('');
      setContentUrl('');
      setDuration('');
      setContentError(false);
      setContentLoading(false);
      return;
    }

    if (!lesson.id) {
      setContentText(lesson.content_text || '');
      setContentUrl(lesson.content_url || '');
      setContentError(false);
      setContentLoading(false);
      return;
    }

    // Body content is not readable from the table — load it explicitly so we can
    // never overwrite real content with blanks.
    let cancelled = false;
    setContentLoading(true);
    setContentError(false);
    fetchLessonContent(lesson.id)
      .then((content) => {
        if (cancelled) return;
        setContentText(content.content_text || '');
        setContentUrl(content.content_url || '');
      })
      .catch(() => {
        if (!cancelled) setContentError(true);
      })
      .finally(() => {
        if (!cancelled) setContentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lesson, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const lessonData = {
        course_id: courseId,
        title,
        order_index: orderIndex,
        content_type: contentType,
        content_text: contentText || null,
        content_url: contentUrl || null,
        duration: duration || null,
      };

      if (lesson?.id) {
        const { error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', lesson.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Lesson updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('lessons')
          .insert(lessonData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Lesson created successfully',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast({
        title: 'Error',
        description: 'Failed to save lesson',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lesson ? 'Edit Lesson' : 'Create Lesson'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderIndex">Order</Label>
              <Input
                id="orderIndex"
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(Number(e.target.value))}
                required
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (optional)</Label>
              <Input
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 15 min"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contentType">Content Type</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(contentType === 'video' || contentType === 'mixed') && (
            <div>
              <Label htmlFor="contentUrl">Video URL</Label>
              <Input
                id="contentUrl"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          )}

          {(contentType === 'text' || contentType === 'mixed') && (
            <div>
              <Label htmlFor="contentText">Text Content</Label>
              <Textarea
                id="contentText"
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                rows={4}
                placeholder="Enter lesson content..."
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : lesson ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LessonDialog;
