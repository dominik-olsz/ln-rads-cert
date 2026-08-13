import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Download, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Results = () => {
  const [searchParams] = useSearchParams();
  const score = parseFloat(searchParams.get("score") || "0");
  const passed = searchParams.get("passed") === "true";
  const attemptId = searchParams.get("attemptId");
  const courseId = searchParams.get("courseId");
  const passPercent = parseFloat(searchParams.get("passPercent") || "80");
  const pointsEarned = parseFloat(searchParams.get("points") || "0");
  const pointsPossible = parseFloat(searchParams.get("maxPoints") || "0");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [generatingCert, setGeneratingCert] = useState(false);
  const [canRetake, setCanRetake] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !courseId || passed) return;

    const checkAttempts = async () => {
      const [{ count }, { data: course }] = await Promise.all([
        supabase
          .from('test_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('is_certification_test', true),
        supabase
          .from('courses')
          .select('attempts_total')
          .eq('id', courseId)
          .maybeSingle(),
      ]);

      setCanRetake((count ?? 0) < (course?.attempts_total ?? 3));
    };

    checkAttempts();
  }, [user, courseId, passed]);

  const generateCertificate = async () => {
    if (!attemptId || !passed) return;

    setGeneratingCert(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { attemptId }
      });

      if (error) throw error;

      setCertificateId(data.certificateId);
      
      toast({
        title: 'Certificate Generated!',
        description: 'Your certificate is ready to download',
      });
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate certificate',
        variant: 'destructive',
      });
    } finally {
      setGeneratingCert(false);
    }
  };

  const downloadCertificate = async () => {
    if (!attemptId) return;

    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { attemptId }
      });

      if (error) throw error;

      // Create HTML file and download
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LN-RADS-Certificate-${data.certificateNumber}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Certificate downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        title: 'Error',
        description: 'Failed to download certificate',
        variant: 'destructive',
      });
    }
  };

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
                    : `You need ${passPercent}% or higher to pass. You can't retake the test.`}
                </p>
              </div>

              <div className="py-8">
                <div className="text-6xl font-bold text-primary mb-2">
                  {score.toFixed(1)}%
                </div>
                <p className="text-muted-foreground">
                  Your Score{pointsPossible > 0 ? ` — ${pointsEarned} / ${pointsPossible} points` : ''}
                </p>
              </div>


              {passed && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-accent">
                    <Award className="h-5 w-5" />
                    <span className="font-semibold">Certificate Earned</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {!certificateId ? (
                      <Button 
                        className="gap-2" 
                        onClick={generateCertificate}
                        disabled={generatingCert}
                      >
                        <Award className="h-4 w-4" />
                        {generatingCert ? 'Generating...' : 'Generate Certificate'}
                      </Button>
                    ) : (
                      <Button 
                        className="gap-2"
                        onClick={downloadCertificate}
                      >
                        <Download className="h-4 w-4" />
                        Download Certificate
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {!passed && courseId && (
                <div className="space-y-4">
                  {canRetake && (
                    <Link to={`/certification-test?courseId=${courseId}&retake=1`}>
                      <Button size="lg">
                        Retake Test
                      </Button>
                    </Link>
                  )}
                  <Link to={`/training/${courseId}`} className="block">
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
                  <p className="text-muted-foreground">Questions</p>
                  <p className="text-lg font-semibold">
                    {pointsPossible > 0 ? pointsPossible / 2 : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Points Earned</p>
                  <p className="text-lg font-semibold text-accent">
                    {pointsPossible > 0 ? `${pointsEarned} / ${pointsPossible}` : Math.round(score)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Passing Score</p>
                  <p className="text-lg font-semibold">{passPercent}%</p>

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
