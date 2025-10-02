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

interface CourseMaterial {
  id: string;
  title: string;
  file_type: string;
  file_url: string;
  explanation: string | null;
}

const Training = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentLesson, setCurrentLesson] = useState(0);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<{ [lessonId: string]: CourseMaterial[] }>({});
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      toast.error('Please sign in to access training');
      navigate('/auth');
      return;
    }

    const fetchTrainingData = async () => {
      try {
        // Fetch lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('course_id', courseId)
          .order('order_index');

        if (lessonsError) throw lessonsError;
        setLessons(lessonsData || []);

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

  const lesson = lessons[currentLesson];
  const progress = lessons.length > 0 ? ((currentLesson + 1) / lessons.length) * 100 : 0;
  const lessonMaterials = lesson ? materials[lesson.id] || [] : [];

  const markLessonComplete = async () => {
    if (!lesson || !user) return;

    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          course_id: courseId!,
          lesson_id: lesson.id,
          completed: true
        }, {
          onConflict: 'user_id,course_id,lesson_id'
        });

      if (error) throw error;

      setUserProgress(prev => new Set(prev).add(lesson.id));
      toast.success('Lesson marked as complete');
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      toast.error('Failed to update progress');
    }
  };

  const handleNext = async () => {
    if (lesson && !userProgress.has(lesson.id)) {
      await markLessonComplete();
    }
    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(currentLesson + 1);
    }
  };

  const handlePrevious = () => {
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1);
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

  if (lessons.length === 0) {
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
              Lesson {currentLesson + 1} of {lessons.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold mb-4">{lesson.title}</h2>
                
                {lesson.content_type === "video" && lesson.content_url && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4">
                    <iframe
                      className="w-full h-full"
                      src={lesson.content_url}
                      title={lesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {lesson.content_type === "image" && lesson.content_url && (
                  <div className="bg-muted rounded-lg overflow-hidden mb-4 p-4">
                    <img
                      src={lesson.content_url}
                      alt={lesson.title}
                      className="w-full max-h-[500px] object-contain"
                    />
                  </div>
                )}

                {lesson.content_type === "text" && lesson.content_text && (
                  <div className="prose prose-sm max-w-none mb-4" dangerouslySetInnerHTML={{ __html: lesson.content_text }} />
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

                {!userProgress.has(lesson.id) && (
                  <Button 
                    onClick={markLessonComplete}
                    className="mt-4"
                    variant="outline"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Complete
                  </Button>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentLesson === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={currentLesson === lessons.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Course Progress</h3>
                <div className="space-y-2">
                  {lessons.map((l, index) => (
                    <button
                      key={l.id}
                      onClick={() => setCurrentLesson(index)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        index === currentLesson
                          ? "bg-primary text-primary-foreground"
                          : index < currentLesson
                          ? "bg-accent/10 border-accent"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {index < currentLesson && (
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium line-clamp-1">{l.title}</span>
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
