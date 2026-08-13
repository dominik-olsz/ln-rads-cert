import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle, Star, X, Lock, Award, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { optionLetter } from "@/lib/questionOptions";
import { resolveMaterialUrls } from "@/lib/materialUrl";
import ImageLightbox from "@/components/ImageLightbox";


interface Lesson {
  id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  order_index: number;
}

interface TestQuestionGroup {
  id: string;
  title: string;
  questions: TestQuestion[];
}

interface CourseItem {
  id: string;
  type: 'lesson' | 'questionGroup';
  title: string;
  order_index: number;
  locked?: boolean;
  data: Lesson | TestQuestionGroup;
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
  options: { text: string }[];
  image_url: string | null;
  group_title: string | null;
  order_index: number;
}

interface AnswerFeedback {
  points: number;
  maxPoints: number;
  correct: boolean;
  correctIndexes: number[];
  semiCorrectIndexes: number[];
  explanation: string | null;
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
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [answerFeedback, setAnswerFeedback] = useState<Record<string, AnswerFeedback>>({});
  const [lessonContents, setLessonContents] = useState<Record<string, { content_text: string | null; content_url: string | null }>>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [certificationEnabled, setCertificationEnabled] = useState(false);
  const [passedAttemptId, setPassedAttemptId] = useState<string | null>(null);
  const [hasFailedAttempt, setHasFailedAttempt] = useState(false);
  const [downloadingCertificate, setDownloadingCertificate] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);


  const handleDownloadCertificate = async () => {
    if (!passedAttemptId) return;
    setDownloadingCertificate(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { attemptId: passedAttemptId },
      });
      if (error) throw error;
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${passedAttemptId}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      console.error('Failed to download certificate:', e);
      toast.error(e.message || 'Could not download your certificate');
    } finally {
      setDownloadingCertificate(false);
    }
  };

  // Grade a practice answer server-side (the answer key is never sent to the browser)
  const handleSelectAnswer = async (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    try {
      const { data, error } = await supabase.functions.invoke('check-answer', {
        body: { questionId, optionIndex },
      });
      if (error) throw error;
      setAnswerFeedback((prev) => ({
        ...prev,
        [questionId]: {
          points: Number(data?.points ?? 0),
          maxPoints: Number(data?.maxPoints ?? 2),
          correct: !!data?.correct,
          correctIndexes: Array.isArray(data?.correctIndexes) ? data.correctIndexes : [],
          semiCorrectIndexes: Array.isArray(data?.semiCorrectIndexes) ? data.semiCorrectIndexes : [],
          explanation: data?.explanation ?? null,
        },
      }));
    } catch (e) {
      console.error('Failed to check answer:', e);
      toast.error('Could not check your answer. Please try again.');
    }
  };


  useEffect(() => {
    const fetchTrainingData = async () => {
      try {
        // Purchase check (visitors can still browse free preview content)
        let purchased = false;
        if (user) {
          const { data: purchaseData } = await supabase
            .from('course_purchases')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .maybeSingle();
          purchased = !!purchaseData;
        }
        setHasPurchased(purchased);

        // Certification status for buyers
        if (purchased && user) {
          const { data: courseRow } = await supabase
            .from('courses')
            .select('certification_enabled')
            .eq('id', courseId)
            .maybeSingle();
          setCertificationEnabled(!!courseRow?.certification_enabled);

          const { data: attempts } = await supabase
            .from('test_attempts')
            .select('id, passed, completed_at')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .eq('is_certification_test', true)
            .order('completed_at', { ascending: false });

          const passed = (attempts || []).find((a: any) => a.passed);
          setPassedAttemptId(passed?.id ?? null);
          setHasFailedAttempt(!passed && (attempts || []).length > 0);
        }


        // Fetch lesson outline (content itself is served by the backend)
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, title, content_type, order_index, is_free, duration, course_id')
          .eq('course_id', courseId)
          .order('order_index');


        if (lessonsError) throw lessonsError;

        // Try fetching course-level test questions via backend function (bypasses RLS)
        let questionsData: any[] = [];
        let lockedGroups: any[] = [];
        try {
          const { data: fnData, error: fnError } = await supabase.functions.invoke('get-test-questions', {
            body: { courseId, testType: 'course' },
          });
          if (fnError) throw fnError as any;
          questionsData = fnData?.questions || [];
          lockedGroups = fnData?.lockedGroups || [];
        } catch (e) {
          console.error('Failed to fetch course test questions via function:', e);
        }

        // Group questions by group_title and order_index
        const questionGroupsMap: Map<string, { title: string; orderIndex: number; questions: any[] }> = new Map();

        questionsData.forEach((question: any) => {
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

        // Convert lessons to items (locked when not free and not purchased)
        const lessonItems: CourseItem[] = (lessonsData || []).map((lesson: any) => ({
          id: lesson.id,
          type: 'lesson' as const,
          title: lesson.title,
          order_index: lesson.order_index,
          locked: !purchased && !lesson.is_free,
          data: lesson,
        }));

        // Convert question groups to items
        const questionGroupItems: CourseItem[] = Array.from(questionGroupsMap.values()).map((group, idx) => ({
          id: `group-${idx}`,
          type: 'questionGroup' as const,
          title: `${group.title} (${group.questions.length})`,
          order_index: group.orderIndex,
          locked: false,
          data: {
            id: `group-${idx}`,
            title: group.title,
            questions: group.questions,
          },
        }));

        // Locked question groups (metadata only, for visitors without access)
        const lockedGroupItems: CourseItem[] = lockedGroups.map((group: any, idx: number) => ({
          id: `locked-group-${idx}`,
          type: 'questionGroup' as const,
          title: `${group.group_title || 'Test Questions'} (${group.count})`,
          order_index: group.order_index ?? 999,
          locked: true,
          data: {
            id: `locked-group-${idx}`,
            title: group.group_title || 'Test Questions',
            questions: [],
          },
        }));

        // Combine and sort by order_index
        const allItems = [...lessonItems, ...questionGroupItems, ...lockedGroupItems].sort(
          (a, b) => a.order_index - b.order_index
        );
        setCourseItems(allItems);

        if (!purchased && allItems.every((item) => item.locked)) {
          toast.error('You need to purchase this course first');
          navigate(`/course/${courseId}`);
          return;
        }

        // Fetch all materials for this course
        const { data: materialsData, error: materialsError } = await supabase
          .from('course_materials')
          .select('*')
          .eq('course_id', courseId);

        if (materialsError) throw materialsError;

        // Group materials by lesson_id, resolving private storage paths to signed URLs
        const signedMaterials = await resolveMaterialUrls(materialsData ?? []);
        const groupedMaterials: { [lessonId: string]: CourseMaterial[] } = {};
        signedMaterials.forEach((material) => {
          if (material.lesson_id) {
            if (!groupedMaterials[material.lesson_id]) {
              groupedMaterials[material.lesson_id] = [];
            }
            groupedMaterials[material.lesson_id].push(material);
          }
        });
        setMaterials(groupedMaterials);


        // Start on the first accessible item
        const firstOpen = allItems.findIndex((item) => !item.locked);
        if (firstOpen > 0) setCurrentItem(firstOpen);

        if (!user) return;

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

        // Fetch user's last position in this course
        const { data: courseProgress } = await supabase
          .from('course_progress')
          .select('last_item_index')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (
          courseProgress &&
          courseProgress.last_item_index < allItems.length &&
          !allItems[courseProgress.last_item_index]?.locked
        ) {
          setCurrentItem(courseProgress.last_item_index);
        }

        // Fetch user's bookmarks
        const { data: bookmarksData } = await supabase
          .from('course_bookmarks')
          .select('item_id')
          .eq('course_id', courseId)
          .eq('user_id', user.id);

        if (bookmarksData) {
          setBookmarks(new Set(bookmarksData.map(b => b.item_id)));
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
  const currentLessonContent =
    currentCourseItem?.type === 'lesson' ? lessonContents[currentCourseItem.id] : undefined;

  /**
   * Opens the lightbox with every image currently rendered in the content area
   * (including images embedded in the lesson's rich text), in visual order.
   */
  const openLightbox = useCallback((clickedSrc: string, clickedEl?: HTMLImageElement | null) => {
    const nodes = Array.from(
      contentRef.current?.querySelectorAll<HTMLImageElement>('img') ?? []
    );
    const images = nodes.map((img) => img.currentSrc || img.src).filter(Boolean);

    let index = clickedEl ? nodes.indexOf(clickedEl) : -1;
    if (index === -1) {
      index = images.findIndex(
        (src) => src === clickedSrc || src === (clickedEl?.src ?? '')
      );
    }

    if (images.length > 0 && index !== -1) {
      setLightbox({ images, index });
    } else {
      setLightbox({ images: [clickedSrc], index: 0 });
    }
  }, []);


  // Load lesson content from the backend (access checked server-side)
  useEffect(() => {
    const item = courseItems[currentItem];
    if (!item || item.type !== 'lesson' || item.locked || lessonContents[item.id]) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-lesson-content', {
          body: { lessonId: item.id },
        });
        if (error) throw error;
        if (cancelled) return;
        setLessonContents((prev) => ({
          ...prev,
          [item.id]: {
            content_text: data?.lesson?.content_text ?? null,
            content_url: data?.lesson?.content_url ?? null,
          },
        }));
      } catch (e) {
        console.error('Failed to load lesson content:', e);
        if (!cancelled) toast.error('Could not load this lesson.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentItem, courseItems, lessonContents]);


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

  const updateCourseProgress = async (itemIndex: number) => {
    if (!user || !courseId) return;

    try {
      const { error } = await supabase
        .from('course_progress')
        .upsert({
          user_id: user.id,
          course_id: courseId,
          last_item_index: itemIndex,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,course_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating course progress:', error);
    }
  };

  const toggleBookmark = async (item: CourseItem) => {
    if (!user || !courseId) return;

    const isBookmarked = bookmarks.has(item.id);

    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from('course_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('item_id', item.id);

        if (error) throw error;

        setBookmarks(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        toast.success('Bookmark removed');
      } else {
        const { error } = await supabase
          .from('course_bookmarks')
          .insert({
            user_id: user.id,
            course_id: courseId,
            item_id: item.id,
            item_type: item.type,
            item_title: item.title,
          });

        if (error) throw error;

        setBookmarks(prev => new Set(prev).add(item.id));
        toast.success('Bookmark added');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    }
  };

  const handleNext = async () => {
    if (currentCourseItem?.type === 'lesson' && !userProgress.has(currentCourseItem.id)) {
      await markLessonComplete();
    }
    if (currentItem < courseItems.length - 1) {
      const nextIndex = currentItem + 1;
      setCurrentItem(nextIndex);
      await updateCourseProgress(nextIndex);
    }
  };

  const handlePrevious = async () => {
    if (currentItem > 0) {
      const prevIndex = currentItem - 1;
      setCurrentItem(prevIndex);
      await updateCourseProgress(prevIndex);
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
            <Card ref={contentRef} className="scroll-mt-28 lg:scroll-mt-32">
              <CardContent className="pt-6">
                {currentCourseItem?.locked ? (
                  <div className="text-center py-12 space-y-4">
                    <Lock className="h-10 w-10 text-muted-foreground mx-auto" />
                    <h2 className="text-xl font-bold">{currentCourseItem.title}</h2>
                    <p className="text-muted-foreground">
                      {user
                        ? 'This part of the course is available after purchase.'
                        : 'This part of the course is available after purchase. Sign in to buy the full course.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button onClick={() => navigate(`/course/${courseId}`)}>
                        Get full access
                      </Button>
                      {!user && (
                        <Button variant="outline" onClick={() => navigate('/auth')}>
                          Sign in
                        </Button>
                      )}
                    </div>
                  </div>
                ) : currentCourseItem?.type === 'lesson' ? (


                  <>
                    <h2 className="text-xl font-bold mb-4">{currentCourseItem.title}</h2>
                    
                    {((currentCourseItem.data as Lesson).content_type === "video" || (currentCourseItem.data as Lesson).content_type === "mixed") && currentLessonContent?.content_url && (
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4">
                        <iframe
                          className="w-full h-full"
                          src={getYouTubeEmbedUrl(currentLessonContent.content_url) || currentLessonContent.content_url}
                          title={currentCourseItem.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {(currentCourseItem.data as Lesson).content_type === "image" && currentLessonContent?.content_url && (
                      <div className="bg-muted rounded-lg overflow-hidden mb-4 p-4">
                        <img
                          src={currentLessonContent.content_url}
                          alt={currentCourseItem.title}
                          className="w-full max-h-[500px] object-contain cursor-zoom-in"
                          onClick={(e) => openLightbox(currentLessonContent.content_url!, e.currentTarget)}
                        />
                      </div>
                    )}

                    {((currentCourseItem.data as Lesson).content_type === "text" || (currentCourseItem.data as Lesson).content_type === "mixed") && currentLessonContent?.content_text && (
                      <div
                        className="prose prose-sm max-w-none mb-4 [&_img]:cursor-zoom-in"
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.tagName === 'IMG') {
                            openLightbox((target as HTMLImageElement).src, target as HTMLImageElement);
                          }
                        }}
                        dangerouslySetInnerHTML={{ __html: currentLessonContent.content_text }}
                      />
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
                                    className="w-full max-h-[400px] object-contain rounded-lg cursor-zoom-in"
                                    onClick={(e) => openLightbox(material.file_url, e.currentTarget)}
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
                ) : currentCourseItem?.type === 'questionGroup' ? (
                  <>
                    {(() => {
                      const group = currentCourseItem.data as TestQuestionGroup;
                      
                      return (
                        <div className="space-y-6">
                          <div className="mb-6">
                            <h2 className="text-xl font-bold">{group.title}</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                              {group.questions.length} {group.questions.length === 1 ? 'question' : 'questions'}
                            </p>
                          </div>
                          
                          {group.questions.map((q, qIndex) => {
                            const selected = selectedAnswers?.[q.id];
                            const feedback = answerFeedback[q.id];
                            const isCorrect = feedback?.correct ?? false;
                            const isSemi = !!feedback && feedback.points === 1;
                            const options = q.options ?? [];

                            return (
                              <div key={q.id} className="border rounded-lg p-6 space-y-4 bg-card">
                                <div className="flex items-start justify-between gap-4">
                                  <h3 className="font-semibold text-lg">Question {qIndex + 1}</h3>
                                </div>
                                
                                {q.image_url && (
                                  <img 
                                    src={q.image_url} 
                                    alt="Question" 
                                    className="w-full rounded-lg border cursor-zoom-in hover:opacity-90 transition-opacity"
                                    onClick={() => openLightbox(q.image_url)}
                                  />
                                )}
                                
                                <p className="text-base">{q.question_text}</p>
                                
                                <div role="radiogroup" className="space-y-2">
                                  {options.map((o, oIndex) => {
                                    const isSelected = selected === oIndex;
                                    const showFeedback = !!feedback;
                                    const isCorrectOption = showFeedback && feedback.correctIndexes.includes(oIndex);
                                    const isSemiOption = showFeedback && feedback.semiCorrectIndexes.includes(oIndex);

                                    let buttonClass = 'border rounded-lg p-3 w-full text-left transition-colors ';
                                    if (isSelected) {
                                      if (showFeedback && isCorrect) {
                                        buttonClass += 'bg-green-100 border-green-500 dark:bg-green-900/20 dark:border-green-600';
                                      } else if (showFeedback && isSemi) {
                                        buttonClass += 'bg-amber-100 border-amber-500 dark:bg-amber-900/20 dark:border-amber-600';
                                      } else if (showFeedback) {
                                        buttonClass += 'bg-red-100 border-red-500 dark:bg-red-900/20 dark:border-red-600';
                                      } else {
                                        buttonClass += 'bg-accent/20 border-primary';
                                      }
                                    } else if (isCorrectOption) {
                                      buttonClass += 'bg-green-50 border-green-300 dark:bg-green-900/10 dark:border-green-700';
                                    } else if (isSemiOption) {
                                      buttonClass += 'bg-amber-50 border-amber-300 dark:bg-amber-900/10 dark:border-amber-700';
                                    } else {
                                      buttonClass += 'hover:bg-muted';
                                    }

                                    return (
                                      <button
                                        type="button"
                                        key={oIndex}
                                        role="radio"
                                        aria-checked={isSelected}
                                        onClick={() => handleSelectAnswer(q.id, oIndex)}
                                        className={buttonClass}
                                      >
                                        <span className="font-medium mr-1">{optionLetter(oIndex)}:</span> {o.text}
                                        {showFeedback && (isCorrectOption || isSemiOption) && (
                                          <span className="ml-2 text-xs text-muted-foreground">
                                            {isCorrectOption ? '2 pts' : '1 pt'}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                
                                {selected !== undefined && feedback && (
                                  <div className={`rounded-lg p-4 mt-4 ${
                                    isCorrect
                                      ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                      : isSemi
                                        ? 'bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                                        : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                  }`}>
                                    <p className="font-semibold mb-2">
                                      {isCorrect ? '✓ Correct!' : isSemi ? '~ Partially correct.' : '✗ Incorrect.'}{' '}
                                      {feedback.points} / {feedback.maxPoints} points — correct answer:{' '}
                                      {feedback.correctIndexes.map((i) => optionLetter(i)).join(', ') || '—'}
                                    </p>
                                    {feedback.explanation && (
                                      <p className="text-sm">{feedback.explanation}</p>
                                    )}
                                  </div>
                                )}

                              </div>
                            );

                          })}
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

          <div className="lg:col-span-1 space-y-4">
            {hasPurchased && certificationEnabled && (
              <Card>
                <CardContent className="pt-6">
                  {passedAttemptId ? (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleDownloadCertificate}
                      disabled={downloadingCertificate}
                    >
                      <Award className="h-5 w-5 mr-2" />
                      {downloadingCertificate ? 'Preparing…' : 'Download Certificate'}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      variant={hasFailedAttempt ? 'outline' : 'default'}
                      onClick={() => navigate(`/certification-test?courseId=${courseId}`)}
                    >
                      <Award className="h-5 w-5 mr-2" />
                      {hasFailedAttempt ? 'Retake Certification Test' : 'Take Certification Test'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {!user && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => navigate(`/course/${courseId}`)}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Buy Course
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="sticky top-28 lg:top-32">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Course Content</h3>
                <div className="space-y-2">
                  {courseItems.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={async () => {
                        setCurrentItem(index);
                        await updateCourseProgress(index);
                        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        index === currentItem
                          ? "bg-primary text-primary-foreground"
                          : index < currentItem
                          ? "bg-accent/10 border-accent"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {item.locked ? (
                          <Lock className="h-4 w-4 flex-shrink-0" />
                        ) : index < currentItem ? (
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        ) : null}
                        <div className="flex-1">
                          <span className="text-xs text-muted-foreground block">
                            {item.type === 'lesson' ? 'Lesson' : 'Course Test'}
                            {item.locked ? ' · Locked' : !hasPurchased ? ' · Free' : ''}
                          </span>
                          <span className="text-sm font-medium line-clamp-1">{item.title}</span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(item);
                          }}
                          className="p-1 hover:bg-background/10 rounded transition-colors"
                          aria-label={bookmarks.has(item.id) ? "Remove bookmark" : "Add bookmark"}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              bookmarks.has(item.id)
                                ? "fill-current text-yellow-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Full size image dialog */}
        <ImageLightbox
          images={lightbox?.images ?? []}
          currentIndex={lightbox?.index ?? 0}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) => setLightbox((prev) => (prev ? { ...prev, index } : null))}
        />
      </div>
    </div>
  );
};

export default Training;
