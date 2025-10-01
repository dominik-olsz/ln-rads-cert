import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Download, Mail, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Results = () => {
  const [searchParams] = useSearchParams();
  const score = parseFloat(searchParams.get("score") || "0");
  const passed = score >= 80;
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [certificateId, setCertificateId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const saveTestAttempt = async () => {
      try {
        // Save test attempt
        const { data: testData, error: testError } = await supabase
          .from('test_attempts')
          .insert({
            user_id: user.id,
            course_id: '00000000-0000-0000-0000-000000000001', // Mock course ID
            score: Math.round(score),
            total_questions: 100,
            passed
          })
          .select()
          .single();

        if (testError) throw testError;

        // If passed, generate certificate
        if (passed && testData) {
          const certificateNumber = `LNRADS-${Date.now()}-${user.id.slice(0, 8)}`;
          
          const { data: certData, error: certError } = await supabase
            .from('certificates')
            .insert({
              user_id: user.id,
              course_id: '00000000-0000-0000-0000-000000000001',
              test_attempt_id: testData.id,
              certificate_number: certificateNumber
            })
            .select()
            .single();

          if (certError && certError.code !== '23505') { // Ignore duplicate error
            throw certError;
          }

          if (certData) {
            setCertificateId(certData.id);
          }
        }
      } catch (error: any) {
        console.error('Error saving test attempt:', error);
        toast({
          title: "Error",
          description: "Failed to save test results",
          variant: "destructive"
        });
      }
    };

    saveTestAttempt();
  }, [user, score, passed, navigate, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="text-center">
            <CardContent className="pt-12 pb-8 space-y-6">
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
                passed ? "bg-accent/20" : "bg-destructive/20"
              }`}>
                {passed ? (
                  <CheckCircle className="h-10 w-10 text-accent" />
                ) : (
                  <XCircle className="h-10 w-10 text-destructive" />
                )}
              </div>

              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {passed ? "Congratulations!" : "Test Not Passed"}
                </h1>
                <p className="text-muted-foreground">
                  {passed
                    ? "You have successfully completed the certification test"
                    : "You need 80% or higher to pass. You can retake the test."}
                </p>
              </div>

              <div className="py-8">
                <div className="text-6xl font-bold text-primary mb-2">
                  {score.toFixed(1)}%
                </div>
                <p className="text-muted-foreground">Your Score</p>
              </div>

              {passed && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-accent">
                    <Award className="h-5 w-5" />
                    <span className="font-semibold">Certificate Earned</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button className="gap-2" disabled={!certificateId}>
                      <Download className="h-4 w-4" />
                      Download Certificate
                    </Button>
                    <Button variant="outline" className="gap-2" disabled={!certificateId}>
                      <Mail className="h-4 w-4" />
                      Email Certificate
                    </Button>
                  </div>
                  
                  {certificateId && (
                    <p className="text-sm text-muted-foreground">
                      Certificate ID: {certificateId}
                    </p>
                  )}
                </div>
              )}

              {!passed && (
                <div className="space-y-4">
                  <Link to="/test">
                    <Button size="lg">
                      Retake Test
                    </Button>
                  </Link>
                  <Link to="/training/1" className="block">
                    <Button variant="outline" size="lg" className="w-full">
                      Review Course Material
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-4">Test Summary</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Total Questions</p>
                  <p className="text-lg font-semibold">100</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Correct Answers</p>
                  <p className="text-lg font-semibold text-accent">
                    {Math.round(score)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Passing Score</p>
                  <p className="text-lg font-semibold">80%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Your Score</p>
                  <p className={`text-lg font-semibold ${passed ? "text-accent" : "text-destructive"}`}>
                    {score.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Link to="/courses">
              <Button variant="outline">Back to Courses</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
