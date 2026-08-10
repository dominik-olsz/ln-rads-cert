import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, BookOpen, FileText, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

interface PurchasedCourse {
  id: string;
  title: string;
  description: string;
  hero_image: string | null;
  total_items: number;
  current_item_index: number;
  purchased_at: string;
  certification_enabled?: boolean;

}

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  course_title: string;
  score: number;
}

interface PassedTestWithoutCertificate {
  attempt_id: string;
  course_title: string;
  score: number;
  completed_at: string;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [purchasedCourses, setPurchasedCourses] = useState<PurchasedCourse[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [passedTestsWithoutCerts, setPassedTestsWithoutCerts] = useState<PassedTestWithoutCertificate[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch purchased courses
      const { data: purchases, error: purchasesError } = await supabase
        .from("course_purchases")
        .select(`
          course_id,
          purchased_at,
          courses (
            id,
            title,
            description,
            hero_image,
            certification_enabled
          )

        `)
        .eq("user_id", user?.id);

      if (purchasesError) throw purchasesError;

      // Fetch course progress and calculate total items for each course
      const coursesWithProgress = await Promise.all(
        (purchases || []).map(async (purchase: any) => {
          // Get total lessons count
          const { count: lessonsCount } = await supabase
            .from("lessons")
            .select("id", { count: "exact", head: true })
            .eq("course_id", purchase.course_id);

          // Get total test question groups count (course-level questions only)
          const { data: questions } = await supabase.functions.invoke('get-test-questions', {
            body: { courseId: purchase.course_id, testType: 'course' },
          });

          // Group questions by group_title to count unique groups
          const questionGroups = new Set();
          (questions?.questions || []).forEach((q: any) => {
            questionGroups.add(q.group_title || 'Test Questions');
          });

          const totalItems = (lessonsCount || 0) + questionGroups.size;

          // Get user's current position
          const { data: progress } = await supabase
            .from("course_progress")
            .select("last_item_index")
            .eq("user_id", user?.id)
            .eq("course_id", purchase.course_id)
            .maybeSingle();

          return {
            id: purchase.courses.id,
            title: purchase.courses.title,
            description: purchase.courses.description,
            hero_image: purchase.courses.hero_image,
            total_items: totalItems,
            current_item_index: progress?.last_item_index ?? 0,
            purchased_at: purchase.purchased_at,
            certification_enabled: !!purchase.courses.certification_enabled,

          };
        })
      );

      setPurchasedCourses(coursesWithProgress);

      // Fetch certificates
      const { data: certsData, error: certsError } = await supabase
        .from("certificates")
        .select(`
          id,
          certificate_number,
          issued_at,
          course_id,
          test_attempt_id,
          test_attempts!inner (
            score
          ),
          courses (
            title
          )
        `)
        .eq("user_id", user?.id)
        .order("issued_at", { ascending: false });

      if (certsError) {
        console.error("Certificate fetch error:", certsError);
        throw certsError;
      }

      const formattedCerts = (certsData || []).map((cert: any) => ({
        id: cert.id,
        certificate_number: cert.certificate_number,
        issued_at: cert.issued_at,
        course_title: cert.courses?.title || "LN-RADS Certification",
        score: cert.test_attempts?.score || 0,
      }));

      setCertificates(formattedCerts);

      // Fetch passed test attempts without certificates
      const { data: passedAttempts, error: attemptsError } = await supabase
        .from("test_attempts")
        .select(`
          id,
          score,
          completed_at,
          courses (
            title
          )
        `)
        .eq("user_id", user?.id)
        .eq("is_certification_test", true)
        .eq("passed", true)
        .order("completed_at", { ascending: false });

      if (attemptsError) throw attemptsError;

      // Filter out attempts that already have certificates
      const certifiedAttemptIds = new Set(certsData?.map((c: any) => c.test_attempt_id));
      const uncertifiedAttempts = (passedAttempts || [])
        .filter((attempt: any) => !certifiedAttemptIds.has(attempt.id))
        .map((attempt: any) => ({
          attempt_id: attempt.id,
          course_title: attempt.courses?.title || "LN-RADS Certification",
          score: attempt.score,
          completed_at: attempt.completed_at,
        }));

      setPassedTestsWithoutCerts(uncertifiedAttempts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async (attemptId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-certificate", {
        body: { attemptId },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Certificate generated successfully",
      });

      // Refresh dashboard data to show the new certificate
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadCertificate = async (certificateId: string) => {
    try {
      const { data: cert } = await supabase
        .from("certificates")
        .select("test_attempt_id")
        .eq("id", certificateId)
        .single();

      if (!cert) return;

      const { data, error } = await supabase.functions.invoke("generate-certificate", {
        body: { attemptId: cert.test_attempt_id },
      });

      if (error) throw error;

      const blob = new Blob([data.html], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${certificateId}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Certificate downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-4xl font-bold">My Dashboard</h1>
          <Button variant="outline" className="rounded-xl border-2" onClick={() => navigate("/account")}>
            <Settings className="h-4 w-4 mr-2" /> Account settings
          </Button>
        </div>

        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto mb-8">
            <TabsTrigger value="courses">
              <BookOpen className="w-4 h-4 mr-2" />
              My Courses
            </TabsTrigger>
            <TabsTrigger value="tests">
              <FileText className="w-4 h-4 mr-2" />
              Certification Tests
            </TabsTrigger>
            <TabsTrigger value="certificates">
              <Award className="w-4 h-4 mr-2" />
              Certificates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            {purchasedCourses.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    You haven't purchased any courses yet.{" "}
                    <Button variant="link" onClick={() => navigate("/courses")} className="p-0">
                      Browse courses
                    </Button>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {purchasedCourses.map((course) => {
                  const completedItems = course.current_item_index + 1;
                  const progressPercentage = course.total_items > 0
                    ? (completedItems / course.total_items) * 100
                    : 0;

                  return (
                    <Card key={course.id}>
                      {course.hero_image && (
                        <img
                          src={course.hero_image}
                          alt={course.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                      )}
                      <CardHeader>
                        <CardTitle>{course.title}</CardTitle>
                        <CardDescription>{course.description?.replace(/<[^>]*>/g, '')}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">Course Progress</span>
                            <span className="text-muted-foreground">
                              {completedItems} / {course.total_items} items
                            </span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {progressPercentage.toFixed(0)}% complete
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => navigate(`/training/${course.id}`)}
                            className="flex-1"
                          >
                            Continue Training
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tests">
            {purchasedCourses.filter((c) => c.certification_enabled).length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    {purchasedCourses.length === 0
                      ? 'Purchase a course to access certification tests.'
                      : 'None of your courses include a certification test.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {purchasedCourses
                  .filter((course) => course.certification_enabled)
                  .map((course) => (
                  <Card key={course.id}>
                    <CardHeader>
                      <CardTitle>{course.title}</CardTitle>
                      <CardDescription>Certification Test</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Complete the certification test to earn your certificate.
                      </p>
                      <Button
                        onClick={() => navigate(`/certification-test?courseId=${course.id}`)}
                        className="w-full"
                      >
                        Start Test
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

          </TabsContent>

          <TabsContent value="certificates">
            {certificates.length === 0 && passedTestsWithoutCerts.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    You haven't earned any certificates yet. Complete a certification test to earn one!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {passedTestsWithoutCerts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Generate Your Certificate</h3>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {passedTestsWithoutCerts.map((test) => (
                        <Card key={test.attempt_id}>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Award className="w-5 h-5 text-primary" />
                              {test.course_title}
                            </CardTitle>
                            <CardDescription>
                              Test Passed - Certificate Available
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2 text-sm">
                              <p>
                                <span className="font-medium">Score:</span> {test.score}%
                              </p>
                              <p>
                                <span className="font-medium">Completed:</span>{" "}
                                {new Date(test.completed_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              onClick={() => generateCertificate(test.attempt_id)}
                              className="w-full"
                            >
                              Generate Certificate
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {certificates.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Your Certificates</h3>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {certificates.map((cert) => (
                        <Card key={cert.id}>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Award className="w-5 h-5 text-primary" />
                              {cert.course_title}
                            </CardTitle>
                            <CardDescription>
                              Certificate #{cert.certificate_number}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2 text-sm">
                              <p>
                                <span className="font-medium">Score:</span> {cert.score}%
                              </p>
                              <p>
                                <span className="font-medium">Issued:</span>{" "}
                                {new Date(cert.issued_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              onClick={() => downloadCertificate(cert.id)}
                              className="w-full"
                              variant="outline"
                            >
                              Download Certificate
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
