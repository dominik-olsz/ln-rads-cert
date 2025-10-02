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
  questions: TestQuestion[];
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

  // Lessons
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState(0);

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
        .eq('course_id', courseId);

      if (questionsError) throw questionsError;

      const lessonsWithQuestions = lessonsData.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        order_index: lesson.order_index,
        content_type: lesson.content_type,
        content_url: lesson.content_url,
        content_text: lesson.content_text || "",
        duration: lesson.duration,
        questions: questionsData.filter(q => q.id === lesson.id) || []
      }));

      setLessons(lessonsWithQuestions);
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
      content_text: "",
      questions: []
    };
    setLessons([...lessons, newLesson]);
    setCurrentLesson(lessons.length);
  };

  const updateLesson = (index: number, updates: Partial<Lesson>) => {
    const updated = [...lessons];
    updated[index] = { ...updated[index], ...updates };
    setLessons(updated);
  };

  const deleteLesson = (index: number) => {
    const updated = lessons.filter((_, i) => i !== index);
    setLessons(updated.map((l, i) => ({ ...l, order_index: i })));
    if (currentLesson >= updated.length) {
      setCurrentLesson(Math.max(0, updated.length - 1));
    }
  };

  const addQuestion = (lessonIndex: number) => {
    const newQuestion: TestQuestion = {
      question_text: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A"
    };
    const updated = [...lessons];
    updated[lessonIndex].questions.push(newQuestion);
    setLessons(updated);
  };

  const updateQuestion = (lessonIndex: number, questionIndex: number, updates: Partial<TestQuestion>) => {
    const updated = [...lessons];
    updated[lessonIndex].questions[questionIndex] = {
      ...updated[lessonIndex].questions[questionIndex],
      ...updates
    };
    setLessons(updated);
  };

  const deleteQuestion = (lessonIndex: number, questionIndex: number) => {
    const updated = [...lessons];
    updated[lessonIndex].questions.splice(questionIndex, 1);
    setLessons(updated);
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

        // Save questions for this lesson - only save complete questions
        if (lesson.questions.length > 0) {
          const validQuestions = lesson.questions.filter(q => 
            q.question_text?.trim() && 
            q.option_a?.trim() && 
            q.option_b?.trim() && 
            q.option_c?.trim() && 
            q.option_d?.trim() &&
            q.correct_answer
          );

          if (validQuestions.length > 0) {
            const questionsToInsert = validQuestions.map(q => ({
              course_id: finalCourseId,
              question_text: q.question_text,
              option_a: q.option_a,
              option_b: q.option_b,
              option_c: q.option_c,
              option_d: q.option_d,
              correct_answer: q.correct_answer,
              explanation: q.explanation || null,
              image_url: q.image_url || null
            }));

            const { error: questionsError } = await supabase
              .from('test_questions')
              .insert(questionsToInsert);

            if (questionsError) throw questionsError;
          }
        }
      }

      toast({
        title: "Success",
        description: "Course saved successfully"
      });

      navigate('/admin/courses');
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
            <TabsTrigger value="lessons">Lessons ({lessons.length})</TabsTrigger>
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

          <TabsContent value="lessons">
            <div className="grid grid-cols-4 gap-6">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Lessons</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {lessons.map((lesson, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${
                        currentLesson === index ? 'bg-muted' : ''
                      }`}
                      onClick={() => setCurrentLesson(index)}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm truncate">{lesson.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLesson(index);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={addLesson}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Lesson
                  </Button>
                </CardContent>
              </Card>

              <Card className="col-span-3">
                {lessons.length === 0 ? (
                  <CardContent className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No lessons yet. Add your first lesson to get started.</p>
                    </div>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader>
                      <CardTitle>Lesson {currentLesson + 1}: {lessons[currentLesson]?.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Lesson Title</Label>
                          <Input
                            value={lessons[currentLesson]?.title}
                            onChange={(e) => updateLesson(currentLesson, { title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Duration</Label>
                          <Input
                            value={lessons[currentLesson]?.duration || ""}
                            onChange={(e) => updateLesson(currentLesson, { duration: e.target.value })}
                            placeholder="e.g., 15 min"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Video URL (Optional)</Label>
                        <div className="flex gap-2">
                          <Video className="h-4 w-4 mt-3 text-muted-foreground" />
                          <Input
                            value={lessons[currentLesson]?.content_url || ""}
                            onChange={(e) => updateLesson(currentLesson, { content_url: e.target.value })}
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
                          content={lessons[currentLesson]?.content_text || ""}
                          onChange={(content) => updateLesson(currentLesson, { content_text: content })}
                          placeholder="Write your lesson content here. Drag and drop images to include them."
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Test Questions ({lessons[currentLesson]?.questions.length})</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addQuestion(currentLesson)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                          </Button>
                        </div>

                        {lessons[currentLesson]?.questions.map((question, qIndex) => (
                          <Card key={qIndex}>
                            <CardContent className="pt-6 space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-4">
                                  <div className="space-y-2">
                                    <Label>Question {qIndex + 1}</Label>
                                    <Input
                                      value={question.question_text}
                                      onChange={(e) =>
                                        updateQuestion(currentLesson, qIndex, { question_text: e.target.value })
                                      }
                                      placeholder="Enter question"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <Input
                                      value={question.option_a}
                                      onChange={(e) =>
                                        updateQuestion(currentLesson, qIndex, { option_a: e.target.value })
                                      }
                                      placeholder="Option A"
                                    />
                                    <Input
                                      value={question.option_b}
                                      onChange={(e) =>
                                        updateQuestion(currentLesson, qIndex, { option_b: e.target.value })
                                      }
                                      placeholder="Option B"
                                    />
                                    <Input
                                      value={question.option_c}
                                      onChange={(e) =>
                                        updateQuestion(currentLesson, qIndex, { option_c: e.target.value })
                                      }
                                      placeholder="Option C"
                                    />
                                    <Input
                                      value={question.option_d}
                                      onChange={(e) =>
                                        updateQuestion(currentLesson, qIndex, { option_d: e.target.value })
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
                                          updateQuestion(currentLesson, qIndex, { correct_answer: value })
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

                                            updateQuestion(currentLesson, qIndex, { image_url: data.publicUrl });
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
                                      onChange={(e) =>
                                        updateQuestion(currentLesson, qIndex, { explanation: e.target.value })
                                      }
                                      placeholder="Explain the correct answer"
                                      rows={2}
                                    />
                                  </div>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteQuestion(currentLesson, qIndex)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </>
                )}
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
                    {lessons.map((lesson, index) => (
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
                        {lesson.questions.length > 0 && (
                          <Badge variant="secondary">{lesson.questions.length} test questions</Badge>
                        )}
                      </div>
                    ))}
                  </div>
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