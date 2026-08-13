import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { optionLetter } from "@/lib/questionOptions";
import ImageLightbox from "@/components/ImageLightbox";

interface TestQuestion {
  id: string;
  question_text: string;
  options: { text: string }[];
  image_url?: string;
  image_urls?: string[];

}


interface QuestionAnswer {
  questionId: string;
  answer: string;
  timeSpent: number;
  locked: boolean;
}

const MAX_ATTEMPTS = 3;
const SUPPORT_EMAIL = 'cert@lnrads.com';

type Gate = 'open' | 'passed' | 'exhausted' | 'payment_required';

const CertificationTest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const courseId =
    searchParams.get('courseId') ??
    ((location.state as { courseId?: string } | null)?.courseId ?? null);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [hasExistingAttempt, setHasExistingAttempt] = useState(false);
  const [gate, setGate] = useState<Gate>('open');
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(MAX_ATTEMPTS);
  const [attemptsIncluded, setAttemptsIncluded] = useState(1);

  const [lastScore, setLastScore] = useState<number | null>(null);
  const [retakePrice, setRetakePrice] = useState<number>(6900);
  const [payLoading, setPayLoading] = useState(false);
  const [retakeCode, setRetakeCode] = useState('');
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [retakeQuote, setRetakeQuote] = useState<{ finalCents: number; userPercent: number; codePercent: number } | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);


  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    checkExistingAttemptAndFetchQuestions();
  }, [user, navigate]);

  const checkExistingAttemptAndFetchQuestions = async () => {
    try {
      // Check if user has purchased a course that grants certification access
      const { data: purchases, error: purchaseError } = await supabase
        .from('course_purchases')
        .select(`
          id,
          courses!inner (
            certification_enabled
          )
        `)
        .eq('user_id', user?.id)
        .eq('courses.certification_enabled', true);

      if (purchaseError) throw purchaseError;

      if (!purchases || purchases.length === 0) {
        toast({
          title: "Purchase Required",
          description: "You must purchase a course that grants certification access before taking this test",
          variant: "destructive",
        });
        setHasPurchased(false);
        setLoading(false);
        return;
      }

      setHasPurchased(true);

      // Latest progress record (used to resume an unfinished attempt)
      // Per-course certification rules (attempts + retake price)
      let courseMaxAttempts = MAX_ATTEMPTS;
      let courseAttemptsIncluded = 1;
      let coursePrice = 6900;
      if (courseId) {
        const { data: courseSettings } = await supabase
          .from('courses')
          .select('attempts_total, attempts_included, retake_price')
          .eq('id', courseId)
          .maybeSingle();

        if (courseSettings) {
          courseMaxAttempts = courseSettings.attempts_total ?? MAX_ATTEMPTS;
          courseAttemptsIncluded = courseSettings.attempts_included ?? 1;
          coursePrice = (courseSettings.retake_price ?? 69) * 100;
          setMaxAttempts(courseMaxAttempts);
          setAttemptsIncluded(courseAttemptsIncluded);
          setRetakePrice(coursePrice);
        }
      }

      let progressQuery = supabase
        .from('certification_test_progress')
        .select('*')
        .eq('user_id', user?.id);
      if (courseId) progressQuery = progressQuery.eq('course_id', courseId);

      const { data: existingProgress, error: progressError } = await progressQuery
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }

      const hasResumableAttempt = !!existingProgress && !existingProgress.is_completed;

      // How many certification attempts has this student used?
      let attemptsQuery = supabase
        .from('test_attempts')
        .select('id, passed, score, completed_at')
        .eq('user_id', user?.id)
        .eq('is_certification_test', true);
      if (courseId) attemptsQuery = attemptsQuery.eq('course_id', courseId);

      const { data: attemptRows } = await attemptsQuery.order('completed_at', { ascending: false });

      const used = attemptRows?.length ?? 0;
      setAttemptsUsed(used);
      const passedAttempt = (attemptRows ?? []).find((a) => a.passed);
      setLastScore(attemptRows?.[0]?.score ?? null);

      if (!hasResumableAttempt) {
        if (passedAttempt) {
          setGate('passed');
          setLoading(false);
          return;
        }

        if (used >= courseMaxAttempts) {
          setGate('exhausted');
          setLoading(false);
          return;
        }

        if (used >= courseAttemptsIncluded) {
          let creditQuery = supabase
            .from('certification_retake_purchases')
            .select('id')
            .is('consumed_at', null);
          if (courseId) creditQuery = creditQuery.eq('course_id', courseId);

          const { data: credit } = await creditQuery.limit(1).maybeSingle();

          if (!credit) {
            if (!courseId) {
              const { data: setting } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'certification_retake_price')
                .maybeSingle();

              setRetakePrice(Number(setting?.value ?? 6900));
            }
            setGate('payment_required');
            setLoading(false);
            return;
          }
        }
      }




      // If there's an incomplete attempt, resume it
      if (existingProgress && !existingProgress.is_completed) {
        const savedQuestions = existingProgress.questions as unknown as TestQuestion[];
        const savedAnswers = existingProgress.answers as unknown as Record<string, QuestionAnswer>;
        
        setQuestions(savedQuestions);
        setCurrentQuestion(existingProgress.current_question_index);
        setAnswers(savedAnswers);
        
        // Check if current question is locked
        const currentQuestionId = savedQuestions[existingProgress.current_question_index]?.id;
        const isCurrentQuestionLocked = savedAnswers[currentQuestionId]?.locked || false;
        
        // Only activate timer if current question is not locked
        if (isCurrentQuestionLocked) {
          setTimeLeft(30);
          setTimerActive(false);
        } else {
          setTimeLeft(existingProgress.time_left);
          setTimerActive(true);
        }
        
        setProgressId(existingProgress.id);
        setShowWelcome(false);
        setLoading(false);
        
        toast({
          title: "Resuming Test",
          description: `Continuing from question ${existingProgress.current_question_index + 1}`,
        });
        return;
      }

      // No existing attempt, fetch questions
      await fetchQuestions();
    } catch (error) {
      console.error('Error checking existing attempt:', error);
      toast({
        title: "Error",
        description: "Failed to load test",
        variant: "destructive",
      });
      navigate("/courses");
    }
  };

  // Timer effect
  useEffect(() => {
    if (!timerActive || timeLeft === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-lock answer when time runs out
          const question = questions[currentQuestion];
          if (question && !answers[question.id]?.locked) {
            // If no answer selected, mark as unanswered (will be counted as wrong)
            const currentAnswerValue = answers[question.id]?.answer || '';
            
            const newAnswers = {
              ...answers,
              [question.id]: {
                questionId: question.id,
                answer: currentAnswerValue,
                timeSpent: 30,
                locked: true
              }
            };

            setAnswers(newAnswers);
            
            // Save the locked state to database
            saveProgress(currentQuestion, newAnswers, 0).then(() => {
              toast({
                title: "Time's Up!",
                description: currentAnswerValue 
                  ? "Your answer has been locked" 
                  : "Question marked as unanswered (incorrect)",
                variant: "destructive",
              });
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, timeLeft, currentQuestion, questions, answers]);

  // Auto-lock question when leaving the page
  useEffect(() => {
    const handleBeforeUnload = async () => {
      const question = questions[currentQuestion];
      if (question && !answers[question.id]?.locked && timerActive) {
        const currentAnswerValue = answers[question.id]?.answer || '';
        
        const newAnswers = {
          ...answers,
          [question.id]: {
            questionId: question.id,
            answer: currentAnswerValue,
            timeSpent: 30 - timeLeft,
            locked: true
          }
        };

        // Save immediately before leaving
        await saveProgress(currentQuestion, newAnswers, 0);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Also handle component unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Lock current question on unmount if timer is active
      const question = questions[currentQuestion];
      if (question && !answers[question.id]?.locked && timerActive) {
        const currentAnswerValue = answers[question.id]?.answer || '';
        
        const newAnswers = {
          ...answers,
          [question.id]: {
            questionId: question.id,
            answer: currentAnswerValue,
            timeSpent: 30 - timeLeft,
            locked: true
          }
        };

        saveProgress(currentQuestion, newAnswers, 0);
      }
    };
  }, [currentQuestion, questions, answers, timerActive, timeLeft]);

  const fetchQuestions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke('get-test-questions', {
        body: { testType: 'certification', ...(courseId ? { courseId } : {}) },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) throw error;

      // Randomize questions and limit to 100 if more
      let fetchedQuestions = data.questions || [];
      fetchedQuestions = fetchedQuestions.sort(() => Math.random() - 0.5);
      
      if (fetchedQuestions.length > 100) {
        fetchedQuestions = fetchedQuestions.slice(0, 100);
      }

      setQuestions(fetchedQuestions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load test questions",
        variant: "destructive",
      });
      navigate("/courses");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (value: string) => {
    const question = questions[currentQuestion];
    if (!question || answers[question.id]?.locked) return;

    const newAnswers = {
      ...answers,
      [question.id]: {
        questionId: question.id,
        answer: value,
        timeSpent: 30 - timeLeft,
        locked: false
      }
    };
    
    setAnswers(newAnswers);
    
    // Save progress to database
    saveProgress(currentQuestion, newAnswers, timeLeft);
  };

  const saveProgress = async (questionIndex: number, currentAnswers: Record<string, QuestionAnswer>, currentTimeLeft: number) => {
    if (!user || !progressId) return;

    try {
      await supabase
        .from('certification_test_progress')
        .update({
          current_question_index: questionIndex,
          answers: currentAnswers as any,
          time_left: currentTimeLeft,
        })
        .eq('id', progressId);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleAcceptAnswer = async () => {
    const question = questions[currentQuestion];
    if (!question || !answers[question.id]) {
      toast({
        title: "No answer selected",
        description: "Please select an answer before accepting",
        variant: "destructive",
      });
      return;
    }

    // Lock the answer
    const newAnswers = {
      ...answers,
      [question.id]: {
        ...answers[question.id],
        locked: true,
        timeSpent: 30 - timeLeft
      }
    };
    
    setAnswers(newAnswers);
    setTimerActive(false);
    
    // Save progress
    await saveProgress(currentQuestion, newAnswers, 30);
    
    toast({
      title: "Answer Locked",
      description: "Your answer has been recorded and cannot be changed",
    });
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      const nextQuestion = currentQuestion + 1;
      setCurrentQuestion(nextQuestion);
      setTimeLeft(30);
      setTimerActive(true);
      // Save progress with new question index
      await saveProgress(nextQuestion, answers, 30);
    }
  };

  const handlePrevious = async () => {
    if (currentQuestion > 0) {
      const prevQuestion = currentQuestion - 1;
      setCurrentQuestion(prevQuestion);
      setTimerActive(false);
      setTimeLeft(30);
      await saveProgress(prevQuestion, answers, 30);
    }
  };

  const handlePayForRetake = async () => {
    setPayLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          type: 'certification_retake',
          ...(courseId ? { courseId } : {}),
          ...(retakeCode.trim() ? { code: retakeCode.trim() } : {}),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.free) {
        toast({ title: 'Retake unlocked', description: 'Your discount covered the full price.' });
        window.location.reload();
        return;
      }
      if (!data?.url) throw new Error('Could not start checkout');

      window.location.href = data.url;
    } catch (error: any) {
      toast({
        title: 'Payment failed',
        description: error.message || 'Could not start checkout',
        variant: 'destructive',
      });
      setPayLoading(false);
    }
  };


  const handleApplyRetakeCode = async () => {
    if (!retakeCode.trim() || !courseId) return;
    setCheckingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-discount', {
        body: { courseId, type: 'certification_retake', code: retakeCode.trim() },
      });
      if (error) throw error;
      if (!data?.valid || data?.error) throw new Error(data?.error || 'This code cannot be used');
      setRetakeQuote(data.pricing);
      toast({ title: 'Discount applied', description: `New price: €${(data.pricing.finalCents / 100).toFixed(2)}` });
    } catch (e: any) {
      setRetakeQuote(null);
      toast({ title: 'Invalid code', description: e.message, variant: 'destructive' });
    } finally {
      setCheckingCode(false);
    }
  };

  const retakeAmountCents = retakeQuote ? retakeQuote.finalCents : retakePrice;

  const handleStartTest = async () => {
    // Create progress record
    try {
      const { data: progressData, error: progressError } = await supabase
        .from('certification_test_progress')
        .insert({
          user_id: user?.id!,
          current_question_index: 0,
          answers: {} as any,
          time_left: 30,
          questions: questions as any,
        })
        .select()
        .single();

      if (progressError) throw progressError;

      setProgressId(progressData.id);
      setShowWelcome(false);
      setTimerActive(true);
    } catch (error) {
      console.error('Error creating progress:', error);
      toast({
        title: "Error",
        description: "Failed to start test",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    // Check all answers are locked
    const allLocked = questions.every(q => answers[q.id]?.locked);
    if (!allLocked) {
      toast({
        title: "Cannot Submit",
        description: "Please answer and accept all questions before submitting",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Format answers for submission
      const formattedAnswers = Object.values(answers).reduce((acc, curr) => {
        acc[curr.questionId] = curr.answer;
        return acc;
      }, {} as Record<string, string>);

      const payload: any = { 
        isCertificationTest: true,
        progressId: progressId,
        answers: formattedAnswers,
        timePerQuestion: Object.values(answers).reduce((acc, curr) => {
          acc[curr.questionId] = curr.timeSpent;
          return acc;
        }, {} as Record<string, number>)
      };

      if (courseId) payload.courseId = courseId;

      const { data, error } = await supabase.functions.invoke('submit-test', {
        body: payload
      });

      if (error) {
        console.error('Submit test error:', error);
        throw error;
      }

      if (!data) {
        console.error('No data returned from submit-test');
        throw new Error('No response data from server');
      }

      const { score, passed, attemptId, passPercent = 80, pointsEarned = 0, pointsPossible = 0 } = data;

      console.log('Test submitted successfully:', { score, passed, attemptId });

      toast({
        title: passed ? "Congratulations!" : "Test Complete",
        description: passed
          ? `You passed with ${pointsEarned}/${pointsPossible} points (${score}%)!`
          : `You scored ${score}%. You need ${passPercent}% to pass. You cannot retake this test.`,
        variant: passed ? "default" : "destructive",
      });

      navigate(`/results?score=${score}&passed=${passed}&isCertification=true&attemptId=${attemptId}&passPercent=${passPercent}&points=${pointsEarned}&maxPoints=${pointsPossible}`);

    } catch (error: any) {
      console.error('Error submitting test:', error);
      
      const errorMessage = error?.message || error?.details || 'Failed to submit test. Please try again.';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

  if (gate !== 'open' || hasExistingAttempt) {
    const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="pt-6 space-y-6 text-center">
                {gate === 'passed' && (
                  <>
                    <h1 className="text-2xl font-bold">Certification Passed</h1>
                    <p className="text-muted-foreground">
                      You have already passed the certification test. Your certificate is
                      available in your dashboard.
                    </p>
                  </>
                )}

                {gate === 'exhausted' && (
                  <>
                    <h1 className="text-2xl font-bold">No Attempts Left</h1>
                    <p className="text-muted-foreground">
                      You have used all {maxAttempts} attempts
                      {lastScore !== null ? ` (last score: ${lastScore}%)` : ''}. To request a
                      reset, please contact the administrator at{' '}
                      <a className="underline font-medium" href={`mailto:${SUPPORT_EMAIL}`}>
                        {SUPPORT_EMAIL}
                      </a>
                      .
                    </p>
                  </>
                )}

                {gate === 'payment_required' && (
                  <>
                    <h1 className="text-2xl font-bold">Retake Required</h1>
                    <p className="text-muted-foreground">
                      You did not pass
                      {lastScore !== null ? ` (score: ${lastScore}%)` : ''}. Your first {attemptsIncluded === 1 ? 'attempt' : `${attemptsIncluded} attempts`}
                      was included with your course. You have {attemptsLeft} of {maxAttempts}{' '}
                      attempts left, and each retake costs{' '}
                      <span className="font-semibold text-foreground">
                        €{(retakePrice / 100).toFixed(2)}
                      </span>
                      .
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Discount code (optional)"
                        value={retakeCode}
                        onChange={(e) => setRetakeCode(e.target.value.toUpperCase())}
                      />
                      <Button
                        variant="outline"
                        onClick={handleApplyRetakeCode}
                        disabled={checkingCode || !retakeCode.trim()}
                      >
                        {checkingCode ? 'Checking…' : 'Apply'}
                      </Button>
                    </div>
                    {retakeQuote && (
                      <p className="text-sm text-muted-foreground">
                        {retakeQuote.userPercent > 0 && `Account discount −${retakeQuote.userPercent}%. `}
                        {retakeQuote.codePercent > 0 && `Code −${retakeQuote.codePercent}%. `}
                        New price:{' '}
                        <span className="font-semibold text-foreground">
                          €{(retakeQuote.finalCents / 100).toFixed(2)}
                        </span>
                      </p>
                    )}
                    <Button onClick={handlePayForRetake} disabled={payLoading} className="w-full">
                      {payLoading
                        ? 'Redirecting to checkout…'
                        : retakeAmountCents === 0
                          ? 'Unlock retake for free'
                          : `Pay €${(retakeAmountCents / 100).toFixed(2)} & retake`}
                    </Button>
                  </>
                )}

                {gate === 'open' && (
                  <>
                    <h1 className="text-2xl font-bold">Test Already Completed</h1>
                    <p className="text-muted-foreground">
                      You have already taken this certification test.
                    </p>
                  </>
                )}

                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  Return to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }


  if (!hasPurchased) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="pt-6 space-y-6 text-center">
                <h1 className="text-2xl font-bold">Purchase Required</h1>
                <p className="text-muted-foreground">
                  You must purchase a course before you can take the certification test.
                </p>
                <Button onClick={() => navigate("/courses")}>
                  View Available Courses
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const question = questions[currentQuestion];
  const currentAnswer = answers[question.id];
  const isLocked = currentAnswer?.locked || false;
  const answeredCount = Object.values(answers).filter(a => a.locked).length;
  const allAnswered = answeredCount === questions.length;

  if (showWelcome) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="text-center space-y-4">
                  <h1 className="text-3xl font-bold">Welcome to the Certification Test</h1>
                  <p className="text-muted-foreground text-lg">
                    You are about to begin your certification examination.
                  </p>
                </div>

                <div className="space-y-4 bg-muted/50 p-6 rounded-lg">
                  <h2 className="font-semibold text-lg">Test Instructions:</h2>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold mt-1">•</span>
                      <span>Total Questions: {questions.length}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold mt-1">•</span>
                      <span>Time per Question: 30 seconds</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold mt-1">•</span>
                      <span>Passing Score: 80%</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold mt-1">•</span>
                      <span>You must accept each answer before moving to the next question</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold mt-1">•</span>
                      <span>Once accepted, answers cannot be changed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold mt-1">•</span>
                      <span>The timer will start automatically when you begin</span>
                    </li>
                  </ul>
                </div>

                <div className="flex justify-center pt-4">
                  <Button onClick={handleStartTest} size="lg">
                    Start Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold">Certification Test</h1>
              <div className="flex items-center gap-4">
                <div className={`text-lg font-bold ${timeLeft <= 10 ? 'text-destructive' : ''}`}>
                  Time: {timeLeft}s
                </div>
                <span className="text-sm text-muted-foreground">
                  Question {currentQuestion + 1} of {questions.length}
                </span>
              </div>
            </div>
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-sm text-muted-foreground">
              Answered & Locked: {answeredCount} / {questions.length}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  Question {currentQuestion + 1}
                  {isLocked && <span className="ml-2 text-sm text-green-600">(Locked ✓)</span>}
                </h2>
                
                <p className="text-foreground mb-4">{question.question_text}</p>
                
                {(() => {
                  const images = (question.image_urls?.length ? question.image_urls : question.image_url ? [question.image_url] : []);
                  if (images.length === 0) return null;
                  return (
                    <div className="mb-6 space-y-2">
                      {images.map((url, i) => (
                        <img
                          key={url}
                          src={url}
                          alt="Question"
                          className="max-w-full rounded-lg border cursor-zoom-in hover:opacity-90 transition-opacity"
                          onClick={() => setLightbox({ images, index: i })}
                        />
                      ))}
                      <p className="text-xs text-muted-foreground mt-1">Click an image to zoom in</p>
                    </div>
                  );
                })()}


                <RadioGroup
                  value={currentAnswer?.answer || ''}
                  onValueChange={handleAnswer}
                  disabled={isLocked}
                  className="space-y-3"
                >
                  {(question.options ?? []).map((option, index) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${
                        isLocked
                          ? 'opacity-75 cursor-not-allowed'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <RadioGroupItem
                        value={String(index)}
                        id={`option-${index}`}
                        disabled={isLocked}
                      />
                      <Label
                        htmlFor={`option-${index}`}
                        className={`flex-1 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span className="font-semibold mr-2">{optionLetter(index)}.</span>
                        {option.text}
                      </Label>
                    </div>
                  ))}

                </RadioGroup>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>

                <div className="flex gap-2">
                  {!isLocked && currentAnswer && (
                    <Button
                      onClick={handleAcceptAnswer}
                      variant="default"
                    >
                      Accept Answer
                    </Button>
                  )}

                  {currentQuestion === questions.length - 1 ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={!allAnswered || submitting}
                    >
                      {submitting ? "Submitting..." : "Submit Test"}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleNext}
                      disabled={!isLocked}
                    >
                      Next Question
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ImageLightbox
        images={lightbox?.images ?? []}
        currentIndex={lightbox?.index ?? 0}
        onClose={() => setLightbox(null)}
        onIndexChange={(index) => setLightbox((prev) => (prev ? { ...prev, index } : null))}
      />
    </div>
  );
};

export default CertificationTest;
