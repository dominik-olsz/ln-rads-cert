// Course Builder with Drag & Drop Ordering
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useBlocker } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Plus, Trash2, Upload, Video, FileText, 
  GripVertical, Save, PlayCircle, CheckCircle, BookOpen, 
  FileQuestion, Award 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import RichTextEditor from "@/components/admin/RichTextEditor";
import QuestionOptionsEditor from "@/components/admin/QuestionOptionsEditor";
import {
  QuestionOption,
  emptyOptions,
  isValidQuestionOptions,
  normalizeOptions,
} from "@/lib/questionOptions";
import { formatEuro } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";


interface Lesson {
  id?: string;
  title: string;
  order_index: number;
  content_type: string;
  content_url?: string;
  content_text: string;
  duration?: string;
  is_free?: boolean;
}

interface TestQuestion {
  id?: string;
  question_text: string;
  options: QuestionOption[];
  explanation?: string;
  image_url?: string;
  order_index?: number;
}


interface TestQuestionsGroup {
  id?: string;
  title?: string;
  order_index: number;
  is_free?: boolean;
  questions: TestQuestion[];
}


const CourseBuilder = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Course basic info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [discountPrice, setDiscountPrice] = useState<string>("");
  const [discountValidUntil, setDiscountValidUntil] = useState<string>("");
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [courseIncludes, setCourseIncludes] = useState("");
  const [whatYouLearn, setWhatYouLearn] = useState("");
  

  // Certification test configuration
  const [certificationEnabled, setCertificationEnabled] = useState(false);
  const [certificationMode, setCertificationMode] = useState<'custom' | 'random'>('random');
  const [certificationQuestionCount, setCertificationQuestionCount] = useState<number>(0);
  const [attemptsIncluded, setAttemptsIncluded] = useState(1);
  const [attemptsTotal, setAttemptsTotal] = useState(3);
  const [courseRetakePrice, setCourseRetakePrice] = useState(69);
  const [certificationPassPercent, setCertificationPassPercent] = useState(80);

  const [certQuestions, setCertQuestions] = useState<TestQuestion[]>([]);


  // Lessons and Test Questions Groups
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [questionGroups, setQuestionGroups] = useState<TestQuestionsGroup[]>([]);
  const [currentItemType, setCurrentItemType] = useState<'lesson' | 'questions'>('lesson');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showAddQuestionsDialog, setShowAddQuestionsDialog] = useState(false);
  const [numQuestionsToAdd, setNumQuestionsToAdd] = useState(1);
  const [draggedItem, setDraggedItem] = useState<{type: 'lesson' | 'questions', index: number} | null>(null);

  // Unsaved changes tracking
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [baselineArmed, setBaselineArmed] = useState(false);

  const currentSnapshot = useMemo(() => JSON.stringify({
    title, description, price, discountPrice, discountValidUntil, heroImage, courseIncludes, whatYouLearn,
    certificationEnabled, certificationMode, certificationQuestionCount, certificationPassPercent,
    attemptsIncluded, attemptsTotal, courseRetakePrice,
    certQuestions, lessons, questionGroups,
  }), [title, description, price, discountPrice, discountValidUntil, heroImage, courseIncludes, whatYouLearn,
    certificationEnabled, certificationMode, certificationQuestionCount, certificationPassPercent,
    attemptsIncluded, attemptsTotal, courseRetakePrice,
    certQuestions, lessons, questionGroups]);


  const isDirty = savedSnapshot !== null && savedSnapshot !== currentSnapshot;

  // Block every in-app navigation away from this page while there are unsaved changes
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (baselineArmed) {
      setSavedSnapshot(currentSnapshot);
      setBaselineArmed(false);
    }
  }, [baselineArmed, currentSnapshot]);

  useEffect(() => {
    if (courseId && courseId !== "new") {
      fetchCourse();
    } else {
      setSavedSnapshot(currentSnapshot);
    }
  }, [courseId]);

  // Warn on browser refresh / close / external navigation
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const cancelLeave = () => {
    if (blocker.state === "blocked") blocker.reset();
  };

  const discardAndLeave = () => {
    setSavedSnapshot(currentSnapshot);
    if (blocker.state === "blocked") blocker.proceed();
  };

  const saveAndLeave = async () => {
    const ok = await saveCourse();
    if (ok && blocker.state === "blocked") {
      blocker.proceed();
    } else if (!ok && blocker.state === "blocked") {
      blocker.reset();
    }
  };



  const fetchCourse = async () => {
    if (!courseId || courseId === "new") return;

    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      setTitle(courseData.title);
      setDescription(courseData.description);
      setPrice(courseData.price || 0);
      setDiscountPrice(
        courseData.discount_price === null || courseData.discount_price === undefined
          ? ""
          : String(courseData.discount_price)
      );
      setDiscountValidUntil(
        courseData.discount_valid_until
          ? new Date(courseData.discount_valid_until).toISOString().slice(0, 10)
          : ""
      );
      setHeroImage(courseData.hero_image);
      setCourseIncludes(courseData.course_includes || "");
      setWhatYouLearn(courseData.what_you_learn || "");
      setCertificationEnabled(courseData.certification_enabled || false);
      setCertificationMode((courseData.certification_mode === 'custom' ? 'custom' : 'random'));
      setCertificationQuestionCount(courseData.certification_question_count ?? 0);
      setAttemptsIncluded(courseData.attempts_included ?? 1);
      setAttemptsTotal(courseData.attempts_total ?? 3);
      setCourseRetakePrice(courseData.retake_price ?? 69);
      setCertificationPassPercent(courseData.certification_pass_percent ?? 80);


      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, course_id, title, content_type, order_index, duration, is_free')
        .eq('course_id', courseId)
        .order('order_index');


      if (lessonsError) throw lessonsError;

      const { data: questionsData, error: questionsError } = await supabase
        .from('test_questions')
        .select('*')
        .eq('course_id', courseId)
        .eq('test_type', 'course')
        .is('lesson_id', null);

      if (questionsError) throw questionsError;

      const { data: certQuestionsData } = await supabase
        .from('test_questions')
        .select('*')
        .eq('course_id', courseId)
        .eq('test_type', 'certification')
        .order('order_index');

      const lessonsWithoutQuestions = lessonsData.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        order_index: lesson.order_index,
        content_type: lesson.content_type,
        content_url: lesson.content_url,
        content_text: lesson.content_text || "",
        duration: lesson.duration,
        is_free: lesson.is_free || false
      }));

      // Group questions by order_index to recreate question groups
      const questionsByOrder = (questionsData || []).reduce((acc, q) => {
        const order = q.order_index ?? 999;
        if (!acc[order]) {
          acc[order] = {
            title: q.group_title || null,
            is_free: q.is_free || false,
            questions: []
          };
        }
        acc[order].questions.push({
          id: q.id,
          question_text: q.question_text,
          options: normalizeOptions(q.options, q),
          explanation: q.explanation ?? undefined,
          image_url: q.image_url ?? undefined,
          order_index: q.order_index ?? 999
        });

        return acc;
      }, {} as Record<number, { title: string | null, is_free: boolean, questions: TestQuestion[] }>);

      const groups: TestQuestionsGroup[] = Object.entries(questionsByOrder).map(([order, data]) => ({
        order_index: parseInt(order),
        title: data.title || undefined,
        is_free: data.is_free,
        questions: data.questions
      }));

      setLessons(lessonsWithoutQuestions);
      setQuestionGroups(groups);
      setCertQuestions(
        (certQuestionsData || []).map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          options: normalizeOptions(q.options, q),
          explanation: q.explanation ?? undefined,
          image_url: q.image_url ?? undefined,
          order_index: q.order_index ?? 0,
        }))
      );

      setBaselineArmed(true);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load course",
        variant: "destructive"
      });
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `hero-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `hero-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-materials')
        .getPublicUrl(filePath);

      setHeroImage(publicUrl);

      toast({
        title: "Success",
        description: "Hero image uploaded successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const addLesson = () => {
    const newLesson: Lesson = {
      title: `Lesson ${lessons.length + 1}`,
      order_index: lessons.length,
      content_type: "mixed",
      content_text: ""
    };
    setLessons([...lessons, newLesson]);
    setCurrentItemType('lesson');
    setCurrentItemIndex(lessons.length);
  };

  const updateLesson = (index: number, updates: Partial<Lesson>) => {
    const updated = [...lessons];
    updated[index] = { ...updated[index], ...updates };
    setLessons(updated);
  };

  const deleteLesson = (index: number) => {
    const updated = lessons.filter((_, i) => i !== index);
    setLessons(updated.map((l, i) => ({ ...l, order_index: i })));
    if (currentItemType === 'lesson' && currentItemIndex >= updated.length && updated.length > 0) {
      setCurrentItemIndex(updated.length - 1);
    } else if (currentItemType === 'lesson' && updated.length === 0 && questionGroups.length > 0) {
      setCurrentItemType('questions');
      setCurrentItemIndex(0);
    }
  };

  const addTestQuestionsGroup = () => {
    setShowAddQuestionsDialog(true);
  };

  const confirmAddTestQuestions = () => {
    const newOrderIndex = lessons.length + questionGroups.length;
    
    const newQuestions: TestQuestion[] = Array.from({ length: numQuestionsToAdd }, () => ({
      question_text: "",
      options: emptyOptions(),
      order_index: newOrderIndex
    }));

    
    const newGroup: TestQuestionsGroup = {
      title: `Test Questions ${questionGroups.length + 1}`,
      order_index: newOrderIndex,
      questions: newQuestions
    };
    
    setQuestionGroups([...questionGroups, newGroup]);
    setCurrentItemType('questions');
    setCurrentItemIndex(questionGroups.length);
    setShowAddQuestionsDialog(false);
    setNumQuestionsToAdd(1);
  };

  const updateQuestionInGroup = (groupIndex: number, questionIndex: number, updates: Partial<TestQuestion>) => {
    const updatedGroups = [...questionGroups];
    updatedGroups[groupIndex].questions[questionIndex] = {
      ...updatedGroups[groupIndex].questions[questionIndex],
      ...updates
    };
    setQuestionGroups(updatedGroups);
  };

  const updateQuestionGroupTitle = (groupIndex: number, title: string) => {
    const updatedGroups = [...questionGroups];
    updatedGroups[groupIndex] = {
      ...updatedGroups[groupIndex],
      title
    };
    setQuestionGroups(updatedGroups);
  };

  const deleteQuestionFromGroup = (groupIndex: number, questionIndex: number) => {
    const updatedGroups = [...questionGroups];
    updatedGroups[groupIndex].questions = updatedGroups[groupIndex].questions.filter((_, i) => i !== questionIndex);
    
    // If no questions left in group, remove the group
    if (updatedGroups[groupIndex].questions.length === 0) {
      deleteQuestionGroup(groupIndex);
    } else {
      setQuestionGroups(updatedGroups);
    }
  };

  const deleteQuestionGroup = (groupIndex: number) => {
    const updated = questionGroups.filter((_, i) => i !== groupIndex);
    setQuestionGroups(updated);
    if (currentItemType === 'questions') {
      if (updated.length === 0) {
        if (lessons.length > 0) {
          setCurrentItemType('lesson');
          setCurrentItemIndex(0);
        }
      } else if (currentItemIndex >= updated.length) {
        setCurrentItemIndex(updated.length - 1);
      }
    }
  };

  const addQuestionToGroup = (groupIndex: number) => {
    const updatedGroups = [...questionGroups];
    const newQuestion: TestQuestion = {
      question_text: "",
      options: emptyOptions(),
      order_index: updatedGroups[groupIndex].order_index
    };

    updatedGroups[groupIndex].questions.push(newQuestion);
    setQuestionGroups(updatedGroups);
  };

  // Combined items for display with drag-and-drop
  type DisplayItem = {
    type: 'lesson' | 'questions';
    index: number;
    orderIndex: number;
    title: string;
  };

  const getDisplayItems = (): DisplayItem[] => {
    const items: DisplayItem[] = lessons.map((l, idx) => ({
      type: 'lesson' as const,
      index: idx,
      orderIndex: l.order_index,
      title: l.title
    }));
    
    // Add each question group as a separate item
    questionGroups.forEach((group, idx) => {
      items.push({
        type: 'questions' as const,
        index: idx,
        orderIndex: group.order_index,
        title: group.title || `Test Questions (${group.questions.length})`
      });
    });
    
    return items.sort((a, b) => a.orderIndex - b.orderIndex);
  };

  const handleDragStart = (type: 'lesson' | 'questions', index: number) => {
    setDraggedItem({ type, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetType: 'lesson' | 'questions', targetIndex: number) => {
    if (!draggedItem) return;
    
    const displayItems = getDisplayItems();
    const draggedDisplayIndex = displayItems.findIndex(
      item => item.type === draggedItem.type && item.index === draggedItem.index
    );
    const targetDisplayIndex = displayItems.findIndex(
      item => item.type === targetType && item.index === targetIndex
    );

    if (draggedDisplayIndex === -1 || targetDisplayIndex === -1) return;

    // Reorder the display items
    const reordered = [...displayItems];
    const [removed] = reordered.splice(draggedDisplayIndex, 1);
    reordered.splice(targetDisplayIndex, 0, removed);

    // Update order_index for all items
    const newLessons = [...lessons];
    const newGroups = [...questionGroups];

    reordered.forEach((item, newOrder) => {
      if (item.type === 'lesson') {
        newLessons[item.index] = { ...newLessons[item.index], order_index: newOrder };
      } else if (item.type === 'questions') {
        newGroups[item.index] = { 
          ...newGroups[item.index], 
          order_index: newOrder,
          questions: newGroups[item.index].questions.map(q => ({ ...q, order_index: newOrder }))
        };
      }
    });

    setLessons(newLessons);
    setQuestionGroups(newGroups);
    setDraggedItem(null);
  };

  const coursePoolSize = questionGroups.reduce((acc, g) => acc + g.questions.length, 0);
  const randomCountInvalid =
    certificationEnabled &&
    certificationMode === 'random' &&
    (!certificationQuestionCount || certificationQuestionCount < 1 || certificationQuestionCount > coursePoolSize);

  const addCertQuestion = () => {
    setCertQuestions([
      ...certQuestions,
      {
        question_text: "",
        options: emptyOptions(),
        order_index: certQuestions.length,
      },

    ]);
  };

  const updateCertQuestion = (index: number, updates: Partial<TestQuestion>) => {
    const updated = [...certQuestions];
    updated[index] = { ...updated[index], ...updates };
    setCertQuestions(updated);
  };

  const deleteCertQuestion = (index: number) => {
    setCertQuestions(certQuestions.filter((_, i) => i !== index));
  };

  const saveCourse = async (): Promise<boolean> => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a course title",
        variant: "destructive"
      });
      return false;
    }

    if (randomCountInvalid) {
      toast({
        title: "Not enough questions",
        description: `This course has ${coursePoolSize} question${coursePoolSize === 1 ? '' : 's'}. Set the certification test length between 1 and ${coursePoolSize}, or add more course questions.`,
        variant: "destructive"
      });
      return false;
    }

    setSaving(true);
    try {
      let finalCourseId = courseId;

      const courseFields = {
        title,
        description,
        price,
        discount_price: discountPrice.trim() === "" ? null : Number(discountPrice),
        discount_valid_until:
          discountPrice.trim() === "" || discountValidUntil === ""
            ? null
            : new Date(`${discountValidUntil}T23:59:59`).toISOString(),
        hero_image: heroImage,
        total_lessons: lessons.length,
        course_includes: courseIncludes,
        what_you_learn: whatYouLearn,
        certification_enabled: certificationEnabled,
        certification_mode: certificationMode,
        certification_question_count:
          certificationEnabled && certificationMode === 'random' ? certificationQuestionCount : null,
        attempts_included: attemptsIncluded,
        attempts_total: attemptsTotal,
        retake_price: courseRetakePrice,
        certification_pass_percent: certificationPassPercent,

      };

      // Save or update course
      if (courseId === "new" || !courseId) {
        const { data: newCourse, error: courseError } = await supabase
          .from('courses')
          .insert(courseFields)
          .select()
          .single();

        if (courseError) throw courseError;
        finalCourseId = newCourse.id;
      } else {
        const { error: updateError } = await supabase
          .from('courses')
          .update(courseFields)
          .eq('id', courseId);

        if (updateError) throw updateError;
      }

      // Delete existing lessons and questions for clean update
      if (finalCourseId && finalCourseId !== "new") {
        await supabase.from('lessons').delete().eq('course_id', finalCourseId);
        await supabase.from('test_questions').delete().eq('course_id', finalCourseId);
      }

      // Save lessons
      for (const lesson of lessons) {
        const { error: lessonError } = await supabase
          .from('lessons')
          .insert({
            course_id: finalCourseId,
            title: lesson.title,
            order_index: lesson.order_index,
            content_type: lesson.content_type,
            content_url: lesson.content_url,
            content_text: lesson.content_text,
            duration: lesson.duration,
            is_free: lesson.is_free || false
          })
          .select()
          .single();

        if (lessonError) throw lessonError;
      }

      const isValidQuestion = (q: TestQuestion) =>
        Boolean(q.question_text?.trim()) && isValidQuestionOptions(q.options);


      // Save course-level test questions
      for (const group of questionGroups) {
        const validQuestions = group.questions.filter(isValidQuestion);

        if (validQuestions.length > 0) {
          const questionsToInsert = validQuestions.map((q) => ({
            course_id: finalCourseId,
            lesson_id: null,
            question_text: q.question_text,
            options: q.options as unknown as any,
            option_a: null,
            option_b: null,
            option_c: null,
            option_d: null,
            correct_answer: null,

            explanation: q.explanation || null,
            image_url: q.image_url || null,
            test_type: 'course',
            order_index: group.order_index,
            group_title: group.title || null,
            is_free: group.is_free || false
          }));

          const { error: questionsError } = await supabase
            .from('test_questions')
            .insert(questionsToInsert);

          if (questionsError) throw questionsError;
        }
      }

      // Save certification questions (custom mode only)
      if (certificationEnabled && certificationMode === 'custom') {
        const validCert = certQuestions.filter(isValidQuestion);

        if (validCert.length > 0) {
          const { error: certError } = await supabase
            .from('test_questions')
            .insert(
              validCert.map((q, idx) => ({
                course_id: finalCourseId,
                lesson_id: null,
                question_text: q.question_text,
                options: q.options as unknown as any,
                option_a: null,
                option_b: null,
                option_c: null,
                option_d: null,
                correct_answer: null,

                explanation: q.explanation || null,
                image_url: q.image_url || null,
                test_type: 'certification',
                order_index: idx,
                is_free: false
              }))
            );

          if (certError) throw certError;
        }
      }

      toast({
        title: "Success",
        description: "Course saved successfully"
      });
      setBaselineArmed(true);
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save course",
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <AlertDialog open={blocker.state === "blocked"} onOpenChange={(open) => !open && cancelLeave()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save changes before leaving?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this course. Do you want to save them before leaving the page?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={cancelLeave}>Cancel</Button>
            <Button variant="outline" onClick={discardAndLeave}>Discard changes</Button>
            <Button onClick={saveAndLeave} disabled={saving}>
              {saving ? "Saving..." : "Save & leave"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      
      <Dialog open={showAddQuestionsDialog} onOpenChange={setShowAddQuestionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Test Questions</DialogTitle>
            <DialogDescription>
              How many test questions do you want to add?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="numQuestions">Number of Questions</Label>
              <Input
                id="numQuestions"
                type="number"
                min="1"
                max="50"
                value={numQuestionsToAdd}
                onChange={(e) => setNumQuestionsToAdd(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddQuestionsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAddTestQuestions}>
              Add {numQuestionsToAdd} Question{numQuestionsToAdd > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/admin/courses')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">
              {courseId === "new" ? "Create New Course" : "Edit Course"}
            </h1>
          </div>
          <Button onClick={saveCourse} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Course"}
          </Button>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto mb-6">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="content">Course Content ({lessons?.length || 0} lessons, {questionGroups?.length || 0} question groups)</TabsTrigger>
            <TabsTrigger value="certification">Certification Test</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>


          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="hero">Hero Image</Label>
                  <div className="flex items-center gap-4">
                    {heroImage ? (
                      <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden border">
                        <img src={heroImage} alt="Hero" className="w-full h-full object-cover" />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => setHeroImage(null)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full max-w-md aspect-video border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                        <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {uploading ? "Uploading..." : "Click to upload hero image"}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleHeroImageUpload}
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Chest X-Ray Fundamentals"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <RichTextEditor
                    content={description}
                    onChange={setDescription}
                    placeholder="Describe what students will learn..."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (€)</Label>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      placeholder="299"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discountPrice">Discounted price (€)</Label>
                    <Input
                      id="discountPrice"
                      type="number"
                      min={0}
                      value={discountPrice}
                      onChange={(e) => setDiscountPrice(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discountValidUntil">Discount valid until</Label>
                    <Input
                      id="discountValidUntil"
                      type="date"
                      value={discountValidUntil}
                      onChange={(e) => setDiscountValidUntil(e.target.value)}
                      disabled={discountPrice.trim() === ""}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for a discount without an end date.
                    </p>
                  </div>
                </div>

                {discountPrice.trim() !== "" && (
                  Number(discountPrice) >= price ? (
                    <p className="text-sm text-destructive">
                      The discounted price must be lower than the regular price ({formatEuro(price)}).
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Students will see{" "}
                      <span className="line-through">{formatEuro(price)}</span>{" "}
                      <span className="font-semibold text-foreground">
                        {formatEuro(Number(discountPrice))}
                      </span>
                      {discountValidUntil
                        ? ` with a countdown ending ${discountValidUntil}.`
                        : " with no end date."}
                    </p>
                  )
                )}

                <div className="space-y-2">
                  <Label htmlFor="courseIncludes">This course includes</Label>
                  <Textarea
                    id="courseIncludes"
                    value={courseIncludes}
                    onChange={(e) => setCourseIncludes(e.target.value)}
                    placeholder="List what's included in the course..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatYouLearn">What You'll Learn</Label>
                  <Textarea
                    id="whatYouLearn"
                    value={whatYouLearn}
                    onChange={(e) => setWhatYouLearn(e.target.value)}
                    placeholder="Key learning outcomes..."
                    rows={3}
                  />
                </div>


              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <div className="grid grid-cols-4 gap-6">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Course Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getDisplayItems().map((item) => {
                    const isCurrent = item.type === currentItemType && item.index === currentItemIndex;
                    return (
                      <div
                        key={`${item.type}-${item.index}`}
                        draggable
                        onDragStart={() => handleDragStart(item.type, item.index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(item.type, item.index)}
                        className={`flex items-center gap-2 p-2 rounded cursor-move hover:bg-muted transition-colors ${
                          isCurrent ? 'bg-muted ring-2 ring-primary' : ''
                        }`}
                        onClick={() => {
                          setCurrentItemType(item.type);
                          setCurrentItemIndex(item.index);
                        }}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        {item.type === 'lesson' ? (
                          <>
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="flex-1 text-sm truncate">{item.title}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteLesson(item.index);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge variant="outline" className="h-4 px-1.5 text-xs flex-shrink-0">Q</Badge>
                            <span className="flex-1 text-sm truncate">{item.title}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteQuestionGroup(item.index);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                  
                  <div className="space-y-2 pt-2">
                    <Button variant="outline" className="w-full" onClick={addLesson}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lesson
                    </Button>
                    <Button variant="outline" className="w-full" onClick={addTestQuestionsGroup}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Test Questions
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-3">
                {lessons.length === 0 && questionGroups.length === 0 ? (
                  <CardContent className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No content yet. Add a lesson or test questions to get started.</p>
                    </div>
                  </CardContent>
                ) : currentItemType === 'lesson' && lessons[currentItemIndex] ? (
                  <>
                    <CardHeader>
                      <CardTitle>{lessons[currentItemIndex]?.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Lesson Title</Label>
                          <Input
                            value={lessons[currentItemIndex]?.title}
                            onChange={(e) => updateLesson(currentItemIndex, { title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Duration</Label>
                          <Input
                            value={lessons[currentItemIndex]?.duration || ""}
                            onChange={(e) => updateLesson(currentItemIndex, { duration: e.target.value })}
                            placeholder="e.g., 15 min"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/30">
                        <Checkbox
                          id="lessonFree"
                          checked={lessons[currentItemIndex]?.is_free || false}
                          onCheckedChange={(checked) =>
                            updateLesson(currentItemIndex, { is_free: checked as boolean })
                          }
                        />
                        <Label htmlFor="lessonFree" className="text-sm cursor-pointer">
                          Free preview — anyone can open this lesson without buying the course
                        </Label>
                      </div>


                      <div className="space-y-2">
                        <Label>Video URL (Optional)</Label>
                        <div className="flex gap-2">
                          <Video className="h-4 w-4 mt-3 text-muted-foreground" />
                          <Input
                            value={lessons[currentItemIndex]?.content_url || ""}
                            onChange={(e) => updateLesson(currentItemIndex, { content_url: e.target.value })}
                            placeholder="YouTube or Vimeo URL"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Lesson Content</Label>
                        <p className="text-xs text-muted-foreground">
                          Use the editor below. You can drag and drop images directly into the content.
                        </p>
                        <RichTextEditor
                          key={currentItemIndex}
                          content={lessons[currentItemIndex]?.content_text || ""}
                          onChange={(content) => updateLesson(currentItemIndex, { content_text: content })}
                          placeholder="Write your lesson content here. Drag and drop images to include them."
                        />
                      </div>
                    </CardContent>
                  </>
                ) : currentItemType === 'questions' && questionGroups[currentItemIndex] ? (
                  <>
                    <CardHeader>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-4">
                            <Label>Group Title</Label>
                            <Input
                              value={questionGroups[currentItemIndex].title || ''}
                              onChange={(e) => updateQuestionGroupTitle(currentItemIndex, e.target.value)}
                              placeholder="e.g., Module 1 Assessment"
                              className="mt-1"
                            />
                          </div>
                          <Button onClick={() => addQuestionToGroup(currentItemIndex)} size="sm" className="mt-6">
                            <Plus className="h-4 w-4 mr-2" />
                            Add More Questions
                          </Button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="groupFree"
                            checked={questionGroups[currentItemIndex].is_free || false}
                            onCheckedChange={(checked) => {
                              const updated = [...questionGroups];
                              updated[currentItemIndex] = {
                                ...updated[currentItemIndex],
                                is_free: checked as boolean,
                              };
                              setQuestionGroups(updated);
                            }}
                          />
                          <Label htmlFor="groupFree" className="text-sm cursor-pointer">
                            Free preview — anyone can open this question group without buying the course
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {questionGroups[currentItemIndex].questions.length} question{questionGroups[currentItemIndex].questions.length !== 1 ? 's' : ''}
                        </p>

                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {questionGroups[currentItemIndex].questions.map((question, idx) => (
                        <Card key={idx} className="relative">
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">Question {idx + 1}</CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteQuestionFromGroup(currentItemIndex, idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label>Question</Label>
                              <Input
                                value={question.question_text}
                                onChange={(e) =>
                                  updateQuestionInGroup(currentItemIndex, idx, { question_text: e.target.value })
                                }
                                placeholder="Enter question"
                              />
                            </div>

                            <QuestionOptionsEditor
                              options={question.options}
                              onChange={(options) =>
                                updateQuestionInGroup(currentItemIndex, idx, { options })
                              }
                            />

                            <div className="grid grid-cols-2 gap-3">


                              <div className="space-y-2">
                                <Label>Image (Optional)</Label>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    setUploading(true);
                                    try {
                                      const fileExt = file.name.split('.').pop();
                                      const fileName = `${Math.random()}.${fileExt}`;
                                      const filePath = `question-images/${fileName}`;

                                      const { error: uploadError } = await supabase.storage
                                        .from('course-materials')
                                        .upload(filePath, file);

                                      if (uploadError) throw uploadError;

                                      const { data } = supabase.storage
                                        .from('course-materials')
                                        .getPublicUrl(filePath);

                                      updateQuestionInGroup(currentItemIndex, idx, { image_url: data.publicUrl });
                                    } catch (error) {
                                      console.error('Upload error:', error);
                                    } finally {
                                      setUploading(false);
                                    }
                                  }}
                                />
                                {question.image_url && (
                                  <img 
                                    src={question.image_url} 
                                    alt="" 
                                    className="max-w-xs rounded mt-2" 
                                  />
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Explanation (Optional)</Label>
                              <Textarea
                                value={question.explanation || ""}
                                onChange={(e) =>
                                  updateQuestionInGroup(currentItemIndex, idx, { explanation: e.target.value })
                                }
                                placeholder="Explain the correct answer"
                                rows={2}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </>
                ) : null}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="certification">
            <Card>
              <CardHeader>
                <CardTitle>Certification Test</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/30">
                  <Checkbox
                    id="certificationEnabled"
                    checked={certificationEnabled}
                    onCheckedChange={(checked) => setCertificationEnabled(checked as boolean)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="certificationEnabled" className="text-sm font-medium cursor-pointer">
                      This course has a certification test
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      When disabled, students will not see a certification exam for this course.
                    </p>
                  </div>
                </div>

                <div className={`p-4 border rounded-lg space-y-4 ${!certificationEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div>
                    <h3 className="text-sm font-medium">Certification Attempts</h3>
                    <p className="text-xs text-muted-foreground">
                      How many exam attempts students get, and what extra attempts cost.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="attemptsIncluded">Attempts included in price</Label>
                      <Input
                        id="attemptsIncluded"
                        type="number"
                        disabled={!certificationEnabled}
                        min="0"
                        value={attemptsIncluded}
                        onChange={(e) => setAttemptsIncluded(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="attemptsTotal">Total attempts allowed</Label>
                      <Input
                        id="attemptsTotal"
                        type="number"
                        disabled={!certificationEnabled}
                        min="1"
                        value={attemptsTotal}
                        onChange={(e) => setAttemptsTotal(Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="retakePrice">Price per extra attempt (€)</Label>
                      <Input
                        id="retakePrice"
                        type="number"
                        disabled={!certificationEnabled}
                        min="0"
                        value={courseRetakePrice}
                        onChange={(e) => setCourseRetakePrice(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                  </div>
                </div>

                {certificationEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Where do the exam questions come from?</Label>
                      <Select
                        value={certificationMode}
                        onValueChange={(value) => setCertificationMode(value as 'custom' | 'random')}
                      >
                        <SelectTrigger className="max-w-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="random">Randomly selected from the course questions</SelectItem>
                          <SelectItem value="custom">Custom certification questions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 max-w-md">
                      <Label htmlFor="certPassPercent">Points required to pass (%)</Label>
                      <Input
                        id="certPassPercent"
                        type="number"
                        min="1"
                        max="100"
                        value={certificationPassPercent}
                        onChange={(e) =>
                          setCertificationPassPercent(Math.min(100, Math.max(1, Number(e.target.value) || 0)))
                        }
                        placeholder="e.g., 80"
                      />
                      <p className="text-xs text-muted-foreground">
                        Each question is worth up to 2 points (correct = 2, semi-correct = 1, wrong = 0).
                        A 100-question exam is worth 200 points.
                      </p>
                    </div>



                    {certificationMode === 'random' ? (
                      <div className="space-y-2 max-w-md">
                        <Label htmlFor="certCount">Number of questions in the exam</Label>
                        <Input
                          id="certCount"
                          type="number"
                          min="1"
                          value={certificationQuestionCount || ''}
                          onChange={(e) => setCertificationQuestionCount(Number(e.target.value))}
                          placeholder="e.g., 50"
                        />
                        <p className="text-xs text-muted-foreground">
                          This course currently has {coursePoolSize} question{coursePoolSize === 1 ? '' : 's'} in its pool.
                        </p>
                        {randomCountInvalid && (
                          <p className="text-xs text-destructive">
                            {certificationQuestionCount > coursePoolSize
                              ? `Only ${coursePoolSize} question${coursePoolSize === 1 ? '' : 's'} available in this course — reduce the exam length or add more questions.`
                              : 'Enter how many questions the exam should have.'}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            {certQuestions.length} certification question{certQuestions.length === 1 ? '' : 's'}
                          </p>
                          <Button size="sm" onClick={addCertQuestion}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                          </Button>
                        </div>

                        {certQuestions.map((question, idx) => (
                          <Card key={idx}>
                            <CardHeader className="pb-4">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Question {idx + 1}</CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => deleteCertQuestion(idx)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label>Question</Label>
                                <Input
                                  value={question.question_text}
                                  onChange={(e) => updateCertQuestion(idx, { question_text: e.target.value })}
                                  placeholder="Enter question"
                                />
                              </div>

                              <QuestionOptionsEditor
                                options={question.options}
                                onChange={(options) => updateCertQuestion(idx, { options })}
                              />

                              <div className="grid grid-cols-2 gap-3">


                                <div className="space-y-2">
                                  <Label>Image (Optional)</Label>
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;

                                      setUploading(true);
                                      try {
                                        const fileExt = file.name.split('.').pop();
                                        const filePath = `question-images/${Math.random()}.${fileExt}`;

                                        const { error: uploadError } = await supabase.storage
                                          .from('course-materials')
                                          .upload(filePath, file);

                                        if (uploadError) throw uploadError;

                                        const { data } = supabase.storage
                                          .from('course-materials')
                                          .getPublicUrl(filePath);

                                        updateCertQuestion(idx, { image_url: data.publicUrl });
                                      } catch (error) {
                                        console.error('Upload error:', error);
                                      } finally {
                                        setUploading(false);
                                      }
                                    }}
                                  />
                                  {question.image_url && (
                                    <img src={question.image_url} alt="" className="max-w-xs rounded mt-2" />
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Explanation (Optional)</Label>
                                <Textarea
                                  value={question.explanation || ""}
                                  onChange={(e) => updateCertQuestion(idx, { explanation: e.target.value })}
                                  placeholder="Explain the correct answer"
                                  rows={2}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {certQuestions.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No certification questions yet. Add at least one question.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h1 className="text-4xl font-bold mb-4">{title || "Untitled Course"}</h1>
                  
                  <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      <span>{lessons.length} lessons</span>
                    </div>
                    {questionGroups.length > 0 && (
                      <div className="flex items-center gap-2">
                        <FileQuestion className="h-5 w-5" />
                        <span>{questionGroups.reduce((acc, g) => acc + g.questions.length, 0)} course use cases</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      <span>Certificate included</span>
                    </div>
                  </div>
                </div>

                {heroImage && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={heroImage}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div 
                  className="text-lg text-muted-foreground prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: description }}
                />

                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-2xl font-bold mb-4">Course Content</h2>
                    <div className="space-y-3">
                      {getDisplayItems().length > 0 ? (
                        getDisplayItems().map((item, index) => (
                          <div
                            key={`${item.type}-${item.index}`}
                            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <PlayCircle className="h-5 w-5 text-primary mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  {item.type === 'lesson' ? 'Lesson' : 'Course Test'}
                                </p>
                                <h3 className="font-semibold">{item.title}</h3>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No content available yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {whatYouLearn && (
                  <Card>
                    <CardContent className="pt-6">
                      <h2 className="text-2xl font-bold mb-4">What You'll Learn</h2>
                      <div className="grid md:grid-cols-2 gap-3">
                        {whatYouLearn.split('\n').filter(Boolean).map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" />
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="lg:col-span-1">
                <Card className="sticky top-20">
                  <CardContent className="pt-6 space-y-6">
                    <div>
                      <div className="text-4xl font-bold text-primary mb-2">€{price}</div>
                      <p className="text-sm text-muted-foreground">One-time payment · Lifetime access</p>
                    </div>

                    {courseIncludes && (
                      <div className="border-t pt-6 space-y-3">
                        <h3 className="font-semibold mb-3">This course includes:</h3>
                        {courseIncludes.split('\n').filter(Boolean).map((item, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-accent flex-shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CourseBuilder;