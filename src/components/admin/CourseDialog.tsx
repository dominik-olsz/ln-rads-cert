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
  total_lessons: number;
  price?: number;
  course_includes?: string;
  what_you_learn?: string;
  title_pl?: string | null;
  description_pl?: string | null;
  course_includes_pl?: string | null;
  what_you_learn_pl?: string | null;
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
  const [totalLessons, setTotalLessons] = useState(0);
  const [price, setPrice] = useState(0);
  const [courseIncludes, setCourseIncludes] = useState('');
  const [whatYouLearn, setWhatYouLearn] = useState('');
  const [titlePl, setTitlePl] = useState('');
  const [descriptionPl, setDescriptionPl] = useState('');
  const [courseIncludesPl, setCourseIncludesPl] = useState('');
  const [whatYouLearnPl, setWhatYouLearnPl] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description);
      setTotalLessons(course.total_lessons);
      setPrice(course.price || 0);
      setCourseIncludes(course.course_includes || '');
      setWhatYouLearn(course.what_you_learn || '');
      setTitlePl(course.title_pl || '');
      setDescriptionPl(course.description_pl || '');
      setCourseIncludesPl(course.course_includes_pl || '');
      setWhatYouLearnPl(course.what_you_learn_pl || '');
    } else {
      setTitle('');
      setDescription('');
      setTotalLessons(0);
      setPrice(0);
      setCourseIncludes('');
      setWhatYouLearn('');
      setTitlePl('');
      setDescriptionPl('');
      setCourseIncludesPl('');
      setWhatYouLearnPl('');
    }
  }, [course, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const courseData = {
        title,
        description,
        total_lessons: totalLessons,
        price,
        course_includes: courseIncludes || null,
        what_you_learn: whatYouLearn || null,
        title_pl: titlePl.trim() || null,
        description_pl: descriptionPl.trim() || null,
        course_includes_pl: courseIncludesPl.trim() || null,
        what_you_learn_pl: whatYouLearnPl.trim() || null,
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
          <div>
            <Label htmlFor="price">Price (€)</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="299"
              min="0"
            />
          </div>
          <div>
            <Label htmlFor="courseIncludes">This course includes</Label>
            <Textarea
              id="courseIncludes"
              value={courseIncludes}
              onChange={(e) => setCourseIncludes(e.target.value)}
              placeholder="List what's included..."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="whatYouLearn">What You'll Learn</Label>
            <Textarea
              id="whatYouLearn"
              value={whatYouLearn}
              onChange={(e) => setWhatYouLearn(e.target.value)}
              placeholder="Key learning outcomes..."
              rows={3}
            />
          </div>
          <div className="space-y-4 rounded-lg border border-dashed p-3 bg-muted/20">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Polish version (optional)
            </p>
            <div>
              <Label htmlFor="titlePl">Tytuł (PL)</Label>
              <Input id="titlePl" value={titlePl} onChange={(e) => setTitlePl(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="descriptionPl">Opis (PL)</Label>
              <Textarea
                id="descriptionPl"
                value={descriptionPl}
                onChange={(e) => setDescriptionPl(e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="courseIncludesPl">Kurs zawiera (PL)</Label>
              <Textarea
                id="courseIncludesPl"
                value={courseIncludesPl}
                onChange={(e) => setCourseIncludesPl(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="whatYouLearnPl">Czego się nauczysz (PL)</Label>
              <Textarea
                id="whatYouLearnPl"
                value={whatYouLearnPl}
                onChange={(e) => setWhatYouLearnPl(e.target.value)}
                rows={3}
              />
            </div>
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
