import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

interface TestQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  image_url?: string;
}

interface QuestionAnswer {
  questionId: string;
  answer: string;
  timeSpent: number;
  locked: boolean;
}

const CertificationTest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!courseId) {
      toast({
        title: "Error",
        description: "No course selected",
        variant: "destructive",
      });
      navigate("/courses");
      return;
    }

    fetchQuestions();
  }, [user, courseId, navigate]);

  // Timer effect
  useEffect(() => {
    if (!timerActive || timeLeft === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-lock answer when time runs out
          const question = questions[currentQuestion];
          if (question && answers[question.id] && !answers[question.id].locked) {
            handleAcceptAnswer();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, timeLeft, currentQuestion, questions, answers]);

  const fetchQuestions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user has purchased this course
      const { data: purchaseData } = await supabase
        .from('course_purchases')
        .select('id')
        .eq('user_id', user?.id)
        .eq('course_id', courseId)
        .single();

      if (!purchaseData) {
        toast({
          title: "Purchase Required",
          description: "You need to purchase this course to take the certification test",
          variant: "destructive",
        });
        navigate(`/course/${courseId}`);
        return;
      }

      setHasPurchased(true);

      const { data, error } = await supabase.functions.invoke('get-test-questions', {
        body: { testType: 'certification' },
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

    setAnswers({
      ...answers,
      [question.id]: {
        questionId: question.id,
        answer: value,
        timeSpent: 30 - timeLeft,
        locked: false
      }
    });
  };

  const handleAcceptAnswer = () => {
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
    setAnswers({
      ...answers,
      [question.id]: {
        ...answers[question.id],
        locked: true,
        timeSpent: 30 - timeLeft
      }
    });

    setTimerActive(false);
    
    toast({
      title: "Answer Locked",
      description: "Your answer has been recorded and cannot be changed",
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setTimeLeft(30);
      setTimerActive(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setTimerActive(false);
      setTimeLeft(30);
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

      const { data, error } = await supabase.functions.invoke('submit-test', {
        body: { 
          courseId, 
          answers: formattedAnswers,
          timePerQuestion: Object.values(answers).reduce((acc, curr) => {
            acc[curr.questionId] = curr.timeSpent;
            return acc;
          }, {} as Record<string, number>)
        }
      });

      if (error) throw error;

      const { score, passed, attemptId } = data;
      
      toast({
        title: passed ? "Congratulations!" : "Test Complete",
        description: passed 
          ? `You passed with a score of ${score}%!` 
          : `You scored ${score}%. You need 80% to pass.`,
        variant: passed ? "default" : "destructive",
      });

      navigate(`/results?score=${score}&passed=${passed}&courseId=${courseId}&attemptId=${attemptId}`);
    } catch (error) {
      console.error('Error submitting test:', error);
      toast({
        title: "Error",
        description: "Failed to submit test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || questions.length === 0) {
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

          {!timerActive && !isLocked && (
            <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100">
                      Timer will start when you move to the next question
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                      You have 30 seconds per question. Once you accept an answer, it cannot be changed.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  Question {currentQuestion + 1}
                  {isLocked && <span className="ml-2 text-sm text-green-600">(Locked ✓)</span>}
                </h2>
                
                <p className="text-foreground mb-4">{question.question_text}</p>
                
                {question.image_url && (
                  <div className="mb-6">
                    <img 
                      src={question.image_url} 
                      alt="Question" 
                      className="max-w-full rounded-lg border"
                    />
                  </div>
                )}

                <RadioGroup
                  value={currentAnswer?.answer || ''}
                  onValueChange={handleAnswer}
                  disabled={isLocked}
                  className="space-y-3"
                >
                  {['A', 'B', 'C', 'D'].map((optionValue) => {
                    const optionText = question[`option_${optionValue.toLowerCase()}` as keyof TestQuestion] as string;
                    return (
                      <div
                        key={optionValue}
                        className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${
                          isLocked 
                            ? 'opacity-75 cursor-not-allowed' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <RadioGroupItem 
                          value={optionValue} 
                          id={`option-${optionValue}`}
                          disabled={isLocked}
                        />
                        <Label
                          htmlFor={`option-${optionValue}`}
                          className={`flex-1 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span className="font-semibold mr-2">{optionValue}.</span>
                          {optionText}
                        </Label>
                      </div>
                    );
                  })}
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

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Question Navigator</h3>
              <div className="grid grid-cols-10 gap-2">
                {questions.map((q, index) => {
                  const isAnswered = answers[q.id]?.locked;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentQuestion(index);
                        setTimerActive(false);
                        setTimeLeft(30);
                      }}
                      className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                        index === currentQuestion
                          ? "bg-primary text-primary-foreground"
                          : isAnswered
                          ? "bg-green-500 text-white"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CertificationTest;
