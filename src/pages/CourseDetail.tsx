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
  grants_certification_access: boolean;
}

interface Lesson {
  id: string;
  title: string;
  order_index: number;
}

interface TestQuestionGroup {
  id: string;
  title: string;
  questions: any[];
}

interface CourseItem {
  id: string;
  type: 'lesson' | 'questionGroup';
  title: string;
  order_index: number;
  data: Lesson | TestQuestionGroup;
}

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [courseItems, setCourseItems] = useState<CourseItem[]>([]);
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

        // Fetch course questions via edge function
        const { data: questionsData } = await supabase.functions.invoke('get-test-questions', {
          body: { courseId: id },
        });

        const questions = questionsData?.questions || [];
        setCourseQuestionsCount(questions.length);

        // Group questions by group_title and order_index
        const questionGroupsMap: Map<string, { title: string; orderIndex: number; questions: any[] }> = new Map();
        
        questions.forEach((question: any) => {
          const groupTitle = question.group_title || 'Test Questions';
          const orderIndex = question.order_index || 0;
          
          if (!questionGroupsMap.has(groupTitle)) {
            questionGroupsMap.set(groupTitle, {
              title: groupTitle,
              orderIndex: orderIndex,
              questions: []
            });
          }
          questionGroupsMap.get(groupTitle)!.questions.push(question);
        });

        // Convert lessons to items
        const lessonItems: CourseItem[] = (lessonsData || []).map((lesson) => ({
          id: lesson.id,
          type: 'lesson' as const,
          title: lesson.title,
          order_index: lesson.order_index,
          data: lesson,
        }));

        // Convert question groups to items
        const questionGroupItems: CourseItem[] = Array.from(questionGroupsMap.values()).map((group, idx) => ({
          id: `group-${idx}`,
          type: 'questionGroup' as const,
          title: `${group.title} (${group.questions.length})`,
          order_index: group.orderIndex,
          data: {
            id: `group-${idx}`,
            title: group.title,
            questions: group.questions,
          },
        }));

        // Combine and sort by order_index
        const allItems = [...lessonItems, ...questionGroupItems].sort((a, b) => a.order_index - b.order_index);
        setCourseItems(allItems);

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
            <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
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
                      <span>{courseQuestionsCount} course use cases</span>
                    </div>
                  )}
                  {course.grants_certification_access && (
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30 font-semibold">
                        Certification Test Access Included
                      </Badge>
                    </div>
                  )}
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
                    {courseItems.length > 0 ? (
                      courseItems.map((item, index) => (
                        <div
                          key={item.id}
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

            <div className="lg:col-span-1 order-1 lg:order-2">
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
                        {course.grants_certification_access && (
                          <Button 
                            className="w-full" 
                            size="lg"
                            variant="outline"
                            onClick={handleStartCertification}
                          >
                            <Award className="h-5 w-5 mr-2" />
                            Take Certification Test
                          </Button>
                        )}
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
