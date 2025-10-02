// Course Builder with Drag & Drop Ordering
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Plus, Trash2, Upload, Video, FileText, 
  GripVertical, Save 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Badge } from "@/components/ui/badge";

interface Lesson {
  id?: string;
  title: string;
  order_index: number;
  content_type: string;
  content_url?: string;
  content_text: string;
  duration?: string;
}

interface TestQuestion {
  id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation?: string;
  image_url?: string;
  order_index?: number;
}

interface TestQuestionsGroup {
  id?: string;
  title?: string;
  order_index: number;
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
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [courseIncludes, setCourseIncludes] = useState("");
  const [whatYouLearn, setWhatYouLearn] = useState("");

  // Lessons and Test Questions Groups
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [questionGroups, setQuestionGroups] = useState<TestQuestionsGroup[]>([]);
  const [currentItemType, setCurrentItemType] = useState<'lesson' | 'questions'>('lesson');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showAddQuestionsDialog, setShowAddQuestionsDialog] = useState(false);
  const [numQuestionsToAdd, setNumQuestionsToAdd] = useState(1);
  const [draggedItem, setDraggedItem] = useState<{type: 'lesson' | 'questions', index: number} | null>(null);

  useEffect(() => {
    if (courseId && courseId !== "new") {
      fetchCourse();
    }
  }, [courseId]);

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
      setHeroImage(courseData.hero_image);
      setCourseIncludes(courseData.course_includes || "");
      setWhatYouLearn(courseData.what_you_learn || "");

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
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

      const lessonsWithoutQuestions = lessonsData.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        order_index: lesson.order_index,
        content_type: lesson.content_type,
        content_url: lesson.content_url,
        content_text: lesson.content_text || "",
        duration: lesson.duration
      }));

      // Group questions by order_index to recreate question groups
      const questionsByOrder = (questionsData || []).reduce((acc, q) => {
        const order = q.order_index ?? 999;
        if (!acc[order]) {
          acc[order] = {
            title: q.group_title || null,
            questions: []
          };
        }
        acc[order].questions.push({
          ...q,
          order_index: q.order_index ?? 999
        });
        return acc;
      }, {} as Record<number, { title: string | null, questions: TestQuestion[] }>);

      const groups: TestQuestionsGroup[] = Object.entries(questionsByOrder).map(([order, data]) => ({
        order_index: parseInt(order),
        title: data.title || undefined,
        questions: data.questions
      }));

      setLessons(lessonsWithoutQuestions);
      setQuestionGroups(groups);
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
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
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
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
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

  const saveCourse = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a course title",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      let finalCourseId = courseId;

      // Save or update course
      if (courseId === "new" || !courseId) {
        const { data: newCourse, error: courseError } = await supabase
          .from('courses')
          .insert({
            title,
            description,
            price,
            hero_image: heroImage,
            total_lessons: lessons.length,
            course_includes: courseIncludes,
            what_you_learn: whatYouLearn
          })
          .select()
          .single();

        if (courseError) throw courseError;
        finalCourseId = newCourse.id;
      } else {
        const { error: updateError } = await supabase
          .from('courses')
          .update({
            title,
            description,
            price,
            hero_image: heroImage,
            total_lessons: lessons.length,
            course_includes: courseIncludes,
            what_you_learn: whatYouLearn
          })
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
        const { data: savedLesson, error: lessonError } = await supabase
          .from('lessons')
          .insert({
            course_id: finalCourseId,
            title: lesson.title,
            order_index: lesson.order_index,
            content_type: lesson.content_type,
            content_url: lesson.content_url,
            content_text: lesson.content_text,
            duration: lesson.duration
          })
          .select()
          .single();

        if (lessonError) throw lessonError;
      }

      // Save course-level test questions
      for (const group of questionGroups) {
        const validQuestions = group.questions.filter(q => 
          q.question_text?.trim() && 
          q.option_a?.trim() && 
          q.option_b?.trim() && 
          q.option_c?.trim() && 
          q.option_d?.trim() &&
          q.correct_answer
        );

        if (validQuestions.length > 0) {
          const questionsToInsert = validQuestions.map((q) => ({
            course_id: finalCourseId,
            lesson_id: null,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_answer: q.correct_answer,
            explanation: q.explanation || null,
            image_url: q.image_url || null,
            test_type: 'course',
            order_index: group.order_index,
            group_title: group.title || null
          }));

          const { error: questionsError } = await supabase
            .from('test_questions')
            .insert(questionsToInsert);

          if (questionsError) throw questionsError;
        }
      }

      toast({
        title: "Success",
        description: "Course saved successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save course",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
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
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="content">Course Content ({lessons?.length || 0} lessons, {questionGroups?.length || 0} question groups)</TabsTrigger>
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
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what students will learn..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="299"
                  />
                </div>

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

                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                value={question.option_a}
                                onChange={(e) =>
                                  updateQuestionInGroup(currentItemIndex, idx, { option_a: e.target.value })
                                }
                                placeholder="Option A"
                              />
                              <Input
                                value={question.option_b}
                                onChange={(e) =>
                                  updateQuestionInGroup(currentItemIndex, idx, { option_b: e.target.value })
                                }
                                placeholder="Option B"
                              />
                              <Input
                                value={question.option_c}
                                onChange={(e) =>
                                  updateQuestionInGroup(currentItemIndex, idx, { option_c: e.target.value })
                                }
                                placeholder="Option C"
                              />
                              <Input
                                value={question.option_d}
                                onChange={(e) =>
                                  updateQuestionInGroup(currentItemIndex, idx, { option_d: e.target.value })
                                }
                                placeholder="Option D"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Correct Answer</Label>
                                <Select
                                  value={question.correct_answer}
                                  onValueChange={(value) =>
                                    updateQuestionInGroup(currentItemIndex, idx, { correct_answer: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="A">Option A</SelectItem>
                                    <SelectItem value="B">Option B</SelectItem>
                                    <SelectItem value="C">Option C</SelectItem>
                                    <SelectItem value="D">Option D</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

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

          <TabsContent value="preview">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {heroImage && (
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <img src={heroImage} alt={title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl font-bold">{title || "Untitled Course"}</h2>
                    </div>
                    <p className="text-muted-foreground">{description}</p>
                  </div>

                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span>Price: €{price}</span>
                    <span>Lessons: {lessons.length}</span>
                  </div>

                  {courseIncludes && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">This course includes:</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{courseIncludes}</p>
                    </div>
                  )}

                  {whatYouLearn && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">What You'll Learn:</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{whatYouLearn}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Course Content</h3>
                    {lessons?.map((lesson, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">
                            Lesson {index + 1}: {lesson.title}
                          </h4>
                          <span className="text-sm text-muted-foreground">{lesson.duration}</span>
                        </div>
                        {lesson.content_url && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Video className="h-4 w-4" />
                            <span>Video included</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {questionGroups && questionGroups.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Course Test Questions</h3>
                      <div className="flex gap-2">
                        {questionGroups.map((group, idx) => (
                          <Badge key={idx} variant="secondary">
                            Group {idx + 1}: {group.questions.length} questions
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CourseBuilder;