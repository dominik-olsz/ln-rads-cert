import { useState, useEffect } from "react";
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

interface TestQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  difficulty: string;
}

const Test = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const fetchQuestions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-test-questions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ courseId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const { questions: fetchedQuestions } = await response.json();
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
  const options = [
    question.option_a,
    question.option_b,
    question.option_c,
    question.option_d,
  ];

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [question.id]: value });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-test`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ courseId, answers }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit test');
      }

      const { score, passed } = await response.json();
      
      toast({
        title: passed ? "Congratulations!" : "Test Complete",
        description: passed 
          ? `You passed with a score of ${score}%!` 
          : `You scored ${score}%. You need 70% to pass.`,
        variant: passed ? "default" : "destructive",
      });

      navigate(`/results?score=${score}&passed=${passed}&courseId=${courseId}`);
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

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold">Certification Test</h1>
              <span className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </span>
            </div>
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-sm text-muted-foreground">
              Answered: {answeredCount} / {questions.length}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  Question {currentQuestion + 1}
                </h2>
                <p className="text-foreground mb-6">{question.question_text}</p>

                <RadioGroup
                  value={answers[question.id] || ''}
                  onValueChange={handleAnswer}
                  className="space-y-3"
                >
                  {options.map((option, index) => {
                    const optionValue = ['A', 'B', 'C', 'D'][index];
                    return (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <RadioGroupItem value={optionValue} id={`option-${index}`} />
                        <Label
                          htmlFor={`option-${index}`}
                          className="flex-1 cursor-pointer"
                        >
                          {option}
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

                {currentQuestion === questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitting}
                  >
                    {submitting ? "Submitting..." : "Submit Test"}
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    Next
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">Question Navigator</h3>
              <div className="grid grid-cols-10 gap-2">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                      index === currentQuestion
                        ? "bg-primary text-primary-foreground"
                        : answers[questions[index].id] !== undefined
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Test;
