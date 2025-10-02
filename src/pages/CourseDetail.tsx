import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, CheckCircle, PlayCircle, BookOpen, FileQuestion } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  total_lessons: number;
  hero_image: string | null;
  course_includes: string | null;
  what_you_learn: string | null;
}

interface Lesson {
  id: string;
  title: string;
  order_index: number;
}

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [courseQuestionsCount, setCourseQuestionsCount] = useState(0);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        // Fetch lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, title, order_index')
          .eq('course_id', id)
          .order('order_index');

        if (lessonsError) throw lessonsError;
        setLessons(lessonsData || []);

        // Fetch course questions count
        const { data: questionsData } = await supabase.functions.invoke('get-test-questions', {
          body: { courseId: id },
        });

        if (questionsData?.questions) {
          setCourseQuestionsCount(questionsData.questions.length);
        }

        // Check if user has purchased this course
        if (user) {
          const { data: purchaseData } = await supabase
            .from('course_purchases')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', id)
            .single();
          
          setHasPurchased(!!purchaseData);
        }
      } catch (error) {
        console.error('Error fetching course:', error);
        toast.error('Failed to load course details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCourseData();
    }
  }, [id, user]);

  const handleBuyCourse = async () => {
    if (!user) {
      toast.error('Please sign in to purchase this course');
      navigate('/auth');
      return;
    }

    setPurchasing(true);
    try {
      const { error } = await supabase
        .from('course_purchases')
        .insert({
          user_id: user.id,
          course_id: id,
          amount_paid: course?.price || 0,
          payment_status: 'completed'
        });

      if (error) throw error;

      setHasPurchased(true);
      toast.success('Course purchased successfully!');
    } catch (error: any) {
      console.error('Error purchasing course:', error);
      toast.error(error.message || 'Failed to purchase course');
    } finally {
      setPurchasing(false);
    }
  };

  const handleStartTraining = () => {
    if (!user) {
      toast.error('Please sign in to start training');
      navigate('/auth');
      return;
    }
    if (!hasPurchased) {
      toast.error('Please purchase this course first');
      return;
    }
    navigate(`/training/${id}`);
  };

  const handleStartCertification = () => {
    if (!user) {
      toast.error('Please sign in to take the certification test');
      navigate('/auth');
      return;
    }
    if (!hasPurchased) {
      toast.error('Please purchase this course first');
      return;
    }
    navigate('/certification-test', { state: { courseId: id } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <p className="text-center">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <p className="text-center">Course not found</p>
        </div>
      </div>
    );
  }

  const courseIncludesList = course.course_includes?.split('\n').filter(Boolean) || [];
  const whatYouLearnList = course.what_you_learn?.split('\n').filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
                <p className="text-lg text-muted-foreground mb-6">{course.description}</p>
                
                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    <span>{course.total_lessons} lessons</span>
                  </div>
                  {courseQuestionsCount > 0 && (
                    <div className="flex items-center gap-2">
                      <FileQuestion className="h-5 w-5" />
                      <span>{courseQuestionsCount} course questions</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    <span>Certificate included</span>
                  </div>
                </div>
              </div>

              {course.hero_image && (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={course.hero_image}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold mb-4">Course Content</h2>
                  <div className="space-y-3">
                    {lessons.length > 0 ? (
                      lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <PlayCircle className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <h3 className="font-semibold">{lesson.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                Lesson {lesson.order_index + 1}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No lessons available yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {whatYouLearnList.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-2xl font-bold mb-4">What You'll Learn</h2>
                    <div className="grid md:grid-cols-2 gap-3">
                      {whatYouLearnList.map((item, index) => (
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
                    <div className="text-4xl font-bold text-primary mb-2">€{course.price}</div>
                    <p className="text-sm text-muted-foreground">One-time payment · Lifetime access</p>
                  </div>

                  <div className="space-y-3">
                    {!hasPurchased ? (
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleBuyCourse}
                        disabled={purchasing}
                      >
                        {purchasing ? 'Processing...' : 'Buy Course'}
                      </Button>
                    ) : (
                      <>
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={handleStartTraining}
                        >
                          <PlayCircle className="h-5 w-5 mr-2" />
                          Start Training
                        </Button>
                        <Button 
                          className="w-full" 
                          size="lg"
                          variant="outline"
                          onClick={handleStartCertification}
                        >
                          <Award className="h-5 w-5 mr-2" />
                          Take Certification Test
                        </Button>
                      </>
                    )}
                  </div>

                  {courseIncludesList.length > 0 && (
                    <div className="border-t pt-6 space-y-3">
                      <h3 className="font-semibold mb-3">This course includes:</h3>
                      {courseIncludesList.map((item, index) => (
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
        </div>
      </section>
    </div>
  );
};

export default CourseDetail;
