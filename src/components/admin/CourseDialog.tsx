import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id?: string;
  title: string;
  description: string;
  duration: string;
  total_lessons: number;
}

interface CourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
  onSuccess: () => void;
}

const CourseDialog = ({ open, onOpenChange, course, onSuccess }: CourseDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [totalLessons, setTotalLessons] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description);
      setDuration(course.duration);
      setTotalLessons(course.total_lessons);
    } else {
      setTitle('');
      setDescription('');
      setDuration('');
      setTotalLessons(0);
    }
  }, [course, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const courseData = {
        title,
        description,
        duration,
        total_lessons: totalLessons,
      };

      if (course?.id) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', course.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Course updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('courses')
          .insert(courseData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Course created successfully',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: 'Error',
        description: 'Failed to save course',
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
          <DialogTitle>{course ? 'Edit Course' : 'Create Course'}</DialogTitle>
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
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="duration">Duration</Label>
            <Input
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., 4 weeks"
              required
            />
          </div>
          <div>
            <Label htmlFor="totalLessons">Total Lessons</Label>
            <Input
              id="totalLessons"
              type="number"
              value={totalLessons}
              onChange={(e) => setTotalLessons(Number(e.target.value))}
              required
              min="0"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : course ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CourseDialog;
