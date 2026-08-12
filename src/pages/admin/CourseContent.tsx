import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, ArrowLeft, FileText, Image } from 'lucide-react';
import LessonDialog from '@/components/admin/LessonDialog';
import CourseMaterialDialog from '@/components/admin/CourseMaterialDialog';
import TestQuestionDialog from '@/components/admin/TestQuestionDialog';
import { resolveMaterialUrls } from '@/lib/materialUrl';
import { attachLessonContent } from '@/lib/lessonContent';



interface Course {
  id: string;
  title: string;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  content_type: string;
  content_text?: string;
  content_url?: string;
  duration?: string;
}

interface Material {
  id: string;
  course_id: string;
  title: string;
  file_url: string;
  file_type: string;
  lesson_id?: string;
  file_size?: number;
}

interface TestQuestion {
  id: string;
  question_text: string;
  course_id: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation?: string;
  image_url?: string;
}

const CourseContent = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<TestQuestion | null>(null);
  
  const { toast } = useToast();

  const fetchCourse = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single();
    if (data) setCourse(data);
  };

  const fetchLessons = async () => {
    const { data } = await supabase
      .from('lessons')
      .select('id, course_id, title, content_type, order_index, duration, is_free')
      .eq('course_id', courseId)
      .order('order_index');
    // Body content is intentionally not fetched here — the lesson dialog loads it
    // per lesson via the secured edge function when it opens.
    if (data) setLessons(data as any);
  };


  const fetchMaterials = async () => {
    const { data } = await supabase
      .from('course_materials')
      .select('*')
      .eq('course_id', courseId);
    if (data) setMaterials(await resolveMaterialUrls(data));
  };

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('test_questions')
      .select('*')
      .eq('course_id', courseId)
      .is('lesson_id', null);
    if (data) setQuestions(data);
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchCourse(), fetchLessons(), fetchMaterials(), fetchQuestions()]);
    setLoading(false);
  };

  useEffect(() => {
    if (courseId) {
      fetchAll();
    }
  }, [courseId]);

  const deleteLesson = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete lesson', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Lesson deleted' });
      fetchLessons();
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm('Delete this material?')) return;
    const { error } = await supabase.from('course_materials').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete material', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Material deleted' });
      fetchMaterials();
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    const { error } = await supabase.from('test_questions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete question', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Question deleted' });
      fetchQuestions();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/courses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-4xl font-bold">{course?.title}</h1>
        </div>

        <Tabs defaultValue="lessons" className="w-full">
          <TabsList>
            <TabsTrigger value="lessons">Lessons ({lessons.length})</TabsTrigger>
            <TabsTrigger value="materials">Images ({materials.length})</TabsTrigger>
            <TabsTrigger value="questions">Test Questions ({questions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="lessons" className="space-y-4">
            <Button onClick={() => { setSelectedLesson(null); setLessonDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lesson
            </Button>
            <div className="grid gap-4">
              {lessons.map((lesson) => (
                <Card key={lesson.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>#{lesson.order_index} - {lesson.title}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedLesson(lesson); setLessonDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteLesson(lesson.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Type: {lesson.content_type}</span>
                      {lesson.duration && <span>Duration: {lesson.duration}</span>}
                      {lesson.content_url && <span>Has video link</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <Button onClick={() => { setSelectedMaterial(null); setMaterialDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Radiology Image
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((material) => (
                <Card key={material.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      {material.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <img src={material.file_url} alt={material.title} className="w-full h-48 object-cover rounded" />
                      <div className="flex justify-between">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedMaterial(material); setMaterialDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteMaterial(material.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <Button onClick={() => { setSelectedQuestion(null); setQuestionDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Test Question
            </Button>
            <div className="grid gap-4">
              {questions.map((question) => (
                <Card key={question.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{question.question_text}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Correct: </span>
                        <span className="text-primary">{question.correct_answer}</span>
                      </div>
                      {question.image_url && (
                        <img src={question.image_url} alt="" className="max-w-xs rounded mt-2" />
                      )}
                      {question.explanation && (
                        <p className="text-sm text-muted-foreground">{question.explanation}</p>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedQuestion(question); setQuestionDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteQuestion(question.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {courseId && (
          <>
            <LessonDialog
              open={lessonDialogOpen}
              onOpenChange={setLessonDialogOpen}
              lesson={selectedLesson}
              courseId={courseId}
              onSuccess={fetchLessons}
            />
            <CourseMaterialDialog
              open={materialDialogOpen}
              onOpenChange={setMaterialDialogOpen}
              material={selectedMaterial}
              courseId={courseId}
              lessons={lessons}
              onSuccess={fetchMaterials}
            />
            <TestQuestionDialog
              open={questionDialogOpen}
              onOpenChange={setQuestionDialogOpen}
              question={selectedQuestion}
              onSuccess={fetchQuestions}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default CourseContent;
