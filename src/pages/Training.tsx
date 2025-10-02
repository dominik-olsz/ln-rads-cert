import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Lesson {
  id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  order_index: number;
}

interface CourseItem {
  id: string;
  type: 'lesson' | 'question';
  title: string;
  order_index: number;
  data: Lesson | TestQuestion;
}

interface CourseMaterial {
  id: string;
  title: string;
  file_type: string;
  file_url: string;
  explanation: string | null;
}

interface TestQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
  image_url: string | null;
}

const Training = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentItem, setCurrentItem] = useState(0);
  const [courseItems, setCourseItems] = useState<CourseItem[]>([]);
  const [materials, setMaterials] = useState<{ [lessonId: string]: CourseMaterial[] }>({});
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<Set<string>>(new Set());
  const [hasPurchased, setHasPurchased] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  useEffect(() => {
    if (!user) {
      toast.error('Please sign in to access training');
      navigate('/auth');
      return;
    }

    const fetchTrainingData = async () => {
      try {
        // Check if user has purchased this course
        const { data: purchaseData } = await supabase
          .from('course_purchases')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single();

        if (!purchaseData) {
          toast.error('You need to purchase this course first');
          navigate(`/course/${courseId}`);
          return;
        }

        setHasPurchased(true);

        // Fetch lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('course_id', courseId)
          .order('order_index');

        if (lessonsError) throw lessonsError;

        // Build initial items from lessons so UI doesn't break if questions fetch fails
        const items: CourseItem[] = (lessonsData || []).map((lesson) => ({
          id: lesson.id,
          type: 'lesson' as const,
          title: lesson.title,
          order_index: lesson.order_index,
          data: lesson,
        }));

        // Try fetching course-level test questions via backend function (bypasses RLS)
        let questionsData: any[] = [];
        try {
          const { data: fnData, error: fnError } = await supabase.functions.invoke('get-test-questions', {
            body: { courseId },
          });
          if (fnError) throw fnError as any;
          questionsData = fnData?.questions || [];
        } catch (e) {
          console.error('Failed to fetch course test questions via function:', e);
        }

        // Append questions after lessons
        items.push(
          ...questionsData.map((question: any, index: number) => ({
            id: question.id,
            type: 'question' as const,
            title: question.question_text || `Question ${index + 1}`,
            order_index: (lessonsData?.length || 0) + index,
            data: question,
          }))
        );

        setCourseItems(items);

        // Fetch all materials for this course
        const { data: materialsData, error: materialsError } = await supabase
          .from('course_materials')
          .select('*')
          .eq('course_id', courseId);

        if (materialsError) throw materialsError;

        // Group materials by lesson_id
        const groupedMaterials: { [lessonId: string]: CourseMaterial[] } = {};
        materialsData?.forEach((material) => {
          if (material.lesson_id) {
            if (!groupedMaterials[material.lesson_id]) {
              groupedMaterials[material.lesson_id] = [];
            }
            groupedMaterials[material.lesson_id].push(material);
          }
        });
        setMaterials(groupedMaterials);

        // Fetch user progress
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('lesson_id')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .eq('completed', true);

        if (progressData) {
          setUserProgress(new Set(progressData.map(p => p.lesson_id).filter(Boolean)));
        }
      } catch (error) {
        console.error('Error fetching training data:', error);
        toast.error('Failed to load training content');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchTrainingData();
    }
  }, [courseId, user, navigate]);

  const currentCourseItem = courseItems[currentItem];
  const progress = courseItems.length > 0 ? ((currentItem + 1) / courseItems.length) * 100 : 0;
  const lessonMaterials = currentCourseItem?.type === 'lesson' ? materials[currentCourseItem.id] || [] : [];

  // Convert YouTube URLs to embed format
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    
    // Already an embed URL
    if (url.includes('youtube.com/embed/')) return url;
    
    // Convert youtube.com/watch?v= to embed
    const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    
    // Convert youtu.be/ to embed
    const shortMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    
    return url;
  };

  const markLessonComplete = async () => {
    if (!currentCourseItem || currentCourseItem.type !== 'lesson' || !user) return;

    const lesson = currentCourseItem.data as Lesson;

    try {
      // Find existing progress row (avoid upsert without unique index)
      const { data: existing, error: findError } = await supabase
        .from('user_progress')
        .select('id, completed')
        .eq('user_id', user.id)
        .eq('course_id', courseId!)
        .eq('lesson_id', lesson.id)
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        if (!existing.completed) {
          const { error: updateError } = await supabase
            .from('user_progress')
            .update({ completed: true, completed_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (updateError) throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            course_id: courseId!,
            lesson_id: lesson.id,
            completed: true,
            completed_at: new Date().toISOString(),
          });
        if (insertError) throw insertError;
      }

      setUserProgress(prev => new Set(prev).add(lesson.id));
      toast.success('Lesson marked as complete');
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      toast.error('Failed to update progress');
    }
  };

  const handleNext = async () => {
    if (currentCourseItem?.type === 'lesson' && !userProgress.has(currentCourseItem.id)) {
      await markLessonComplete();
    }
    if (currentItem < courseItems.length - 1) {
      setCurrentItem(currentItem + 1);
    }
  };

  const handlePrevious = () => {
    if (currentItem > 0) {
      setCurrentItem(currentItem - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center">Loading training content...</p>
        </div>
      </div>
    );
  }

  if (courseItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center">No training content available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">Course Training</h1>
            <span className="text-sm text-muted-foreground">
              Item {currentItem + 1} of {courseItems.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                {currentCourseItem?.type === 'lesson' ? (
                  <>
                    <h2 className="text-xl font-bold mb-4">{currentCourseItem.title}</h2>
                    
                    {((currentCourseItem.data as Lesson).content_type === "video" || (currentCourseItem.data as Lesson).content_type === "mixed") && (currentCourseItem.data as Lesson).content_url && (
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4">
                        <iframe
                          className="w-full h-full"
                          src={getYouTubeEmbedUrl((currentCourseItem.data as Lesson).content_url!) || (currentCourseItem.data as Lesson).content_url!}
                          title={currentCourseItem.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {(currentCourseItem.data as Lesson).content_type === "image" && (currentCourseItem.data as Lesson).content_url && (
                      <div className="bg-muted rounded-lg overflow-hidden mb-4 p-4">
                        <img
                          src={(currentCourseItem.data as Lesson).content_url!}
                          alt={currentCourseItem.title}
                          className="w-full max-h-[500px] object-contain"
                        />
                      </div>
                    )}

                    {((currentCourseItem.data as Lesson).content_type === "text" || (currentCourseItem.data as Lesson).content_type === "mixed") && (currentCourseItem.data as Lesson).content_text && (
                      <div className="prose prose-sm max-w-none mb-4" dangerouslySetInnerHTML={{ __html: (currentCourseItem.data as Lesson).content_text! }} />
                    )}

                    {/* Display course materials for this lesson */}
                    {lessonMaterials.length > 0 && (
                      <div className="space-y-4 mt-6">
                        <h3 className="font-semibold text-lg">Additional Materials</h3>
                        {lessonMaterials.map((material) => (
                          <div key={material.id} className="border rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <h4 className="font-medium mb-2">{material.title}</h4>
                                {material.explanation && (
                                  <p className="text-sm text-muted-foreground mb-3">{material.explanation}</p>
                                )}
                                {material.file_type === 'image' && (
                                  <img 
                                    src={material.file_url} 
                                    alt={material.title}
                                    className="w-full max-h-[400px] object-contain rounded-lg"
                                  />
                                )}
                                {material.file_type === 'video' && (
                                  <video 
                                    src={material.file_url} 
                                    controls
                                    className="w-full max-h-[400px] rounded-lg"
                                  />
                                )}
                                {material.file_type === 'pdf' && (
                                  <a 
                                    href={material.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    View PDF Document
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : currentCourseItem?.type === 'question' ? (
                  <>
                    <h2 className="text-xl font-bold mb-4">Course Test Question</h2>
                    {(() => {
                      const q = currentCourseItem.data as TestQuestion;
                      const selected = selectedAnswers[currentCourseItem.id];

                      const normalizeLetter = (val?: string | null) => {
                        if (!val) return '';
                        const v = String(val).trim();
                        const first = v.charAt(0).toUpperCase();
                        if (['A','B','C','D'].includes(first)) return first;
                        const lower = v.toLowerCase();
                        if (lower === (q.option_a || '').toLowerCase()) return 'A';
                        if (lower === (q.option_b || '').toLowerCase()) return 'B';
                        if (lower === (q.option_c || '').toLowerCase()) return 'C';
                        if (lower === (q.option_d || '').toLowerCase()) return 'D';
                        return first;
                      };

                      const correctLetter = normalizeLetter(q.correct_answer);
                      const isCorrect = selected && correctLetter ? selected === correctLetter : false;

                      const options = [
                        { key: 'A', text: q.option_a },
                        { key: 'B', text: q.option_b },
                        { key: 'C', text: q.option_c },
                        { key: 'D', text: q.option_d },
                      ] as const;
                      return (
                        <div className="space-y-4">
                          {q.image_url && (
                            <img 
                              src={q.image_url!} 
                              alt="Question" 
                              className="w-full max-h-[300px] object-contain rounded-lg border"
                            />
                          )}
                          <p className="text-lg font-medium">{q.question_text}</p>
                          <div role="radiogroup" className="space-y-2">
                            {options.map((o) => {
                              const isSelected = selected === o.key;
                              const isCorrectOption = o.key === correctLetter;
                              const showFeedback = selected !== undefined;
                              
                              let buttonClass = 'border rounded-lg p-3 w-full text-left transition-colors ';
                              if (isSelected) {
                                if (showFeedback && isCorrect) {
                                  buttonClass += 'bg-green-100 border-green-500 dark:bg-green-900/20 dark:border-green-600';
                                } else if (showFeedback && !isCorrect) {
                                  buttonClass += 'bg-red-100 border-red-500 dark:bg-red-900/20 dark:border-red-600';
                                } else {
                                  buttonClass += 'bg-accent/20 border-primary';
                                }
                              } else {
                                buttonClass += 'hover:bg-muted';
                              }
                              
                              return (
                                <button
                                  type="button"
                                  key={o.key}
                                  role="radio"
                                  aria-checked={isSelected}
                                  onClick={() => setSelectedAnswers(prev => ({ ...prev, [currentCourseItem.id]: o.key as 'A' | 'B' | 'C' | 'D' }))}
                                  className={buttonClass}
                                >
                                  <span className="font-medium mr-1">{o.key}:</span> {o.text}
                                </button>
                              );
                            })}
                          </div>
                          {selected && (
                            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
                              <p className="font-semibold mb-2">
                                {isCorrect ? 'Correct!' : 'Incorrect.'} Correct Answer: {correctLetter}
                              </p>
                              {q.explanation && (
                                <p className="text-sm text-muted-foreground">{q.explanation}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                ) : null}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentItem === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={currentItem === courseItems.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Course Content</h3>
                <div className="space-y-2">
                  {courseItems.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentItem(index)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        index === currentItem
                          ? "bg-primary text-primary-foreground"
                          : index < currentItem
                          ? "bg-accent/10 border-accent"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {index < currentItem && (
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <span className="text-xs text-muted-foreground block">
                            {item.type === 'lesson' ? 'Lesson' : 'Course Test'}
                          </span>
                          <span className="text-sm font-medium line-clamp-1">{item.title}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Training;
