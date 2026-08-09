import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CourseMaterial {
  id?: string;
  course_id: string;
  lesson_id?: string;
  title: string;
  file_url: string;
  file_type: string;
  file_size?: number;
}

interface CourseMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: CourseMaterial | null;
  courseId: string;
  lessons: { id: string; title: string }[];
  onSuccess: () => void;
}

const CourseMaterialDialog = ({ open, onOpenChange, material, courseId, lessons, onSuccess }: CourseMaterialDialogProps) => {
  const [title, setTitle] = useState('');
  const [lessonId, setLessonId] = useState<string>('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState('image');
  const [explanation, setExplanation] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (material) {
      setTitle(material.title);
      setLessonId(material.lesson_id || '');
      setFileUrl(material.file_url);
      setFileType(material.file_type);
    } else {
      setTitle('');
      setLessonId('');
      setFileUrl('');
      setFileType('image');
      setExplanation('');
    }
  }, [material, open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${courseId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(MATERIAL_BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store the private storage path; access-checked signed URLs are created on read.
      setFileUrl(filePath);

      
      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const materialData = {
        course_id: courseId,
        lesson_id: lessonId || null,
        title,
        file_url: fileUrl,
        file_type: fileType,
      };

      if (material?.id) {
        const { error } = await supabase
          .from('course_materials')
          .update(materialData)
          .eq('id', material.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Material updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('course_materials')
          .insert(materialData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Material added successfully',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving material:', error);
      toast({
        title: 'Error',
        description: 'Failed to save material',
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
          <DialogTitle>{material ? 'Edit Material' : 'Add Radiology Image'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chest X-Ray - Pneumonia Case"
              required
            />
          </div>

          <div>
            <Label htmlFor="lesson">Link to Lesson (optional)</Label>
            <Select value={lessonId || 'none'} onValueChange={(val) => setLessonId(val === 'none' ? '' : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lesson" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {lessons.map((lesson) => (
                  <SelectItem key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="fileType">File Type</Label>
            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="file">Upload File</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileUpload}
              accept="image/*,application/pdf,.doc,.docx"
              disabled={uploading}
            />
            {uploading && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
          </div>

          {fileUrl && (
            <div>
              <Label>Current File</Label>
              <Input value={fileUrl} readOnly className="text-sm" />
            </div>
          )}

          <div>
            <Label htmlFor="explanation">Explanation (in title or separate field)</Label>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              placeholder="Add clinical explanation or teaching points..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !fileUrl}>
              {loading ? 'Saving...' : material ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CourseMaterialDialog;
