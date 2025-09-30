import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Award, CheckCircle, PlayCircle } from "lucide-react";

const CourseDetail = () => {
  const { id } = useParams();

  // Mock course data - will be replaced with database data
  const course = {
    id: "1",
    title: "Chest X-Ray Interpretation Fundamentals",
    description: "Master the basics of chest radiography interpretation with comprehensive video lessons and practice cases. This course covers systematic approaches to chest X-ray analysis, common pathologies, and diagnostic techniques.",
    price: 299,
    duration: "12 hours",
    students: 1240,
    level: "Beginner",
    imageUrl: "/placeholder.svg",
    modules: [
      { id: 1, title: "Introduction to Chest Radiography", lessons: 8, duration: "2h" },
      { id: 2, title: "Systematic Analysis Approach", lessons: 10, duration: "2.5h" },
      { id: 3, title: "Common Pathologies", lessons: 12, duration: "3h" },
      { id: 4, title: "Advanced Interpretation", lessons: 10, duration: "2.5h" },
      { id: 5, title: "Practice Cases", lessons: 15, duration: "2h" },
    ],
    features: [
      "HD video lessons",
      "Downloadable resources",
      "Interactive image gallery",
      "Practice test questions",
      "Final certification exam",
      "Lifetime access",
      "Community support",
      "Certificate of completion"
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <Badge className="mb-4">{course.level}</Badge>
                <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
                <p className="text-lg text-muted-foreground mb-6">{course.description}</p>
                
                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span>{course.students} students enrolled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    <span>Certificate included</span>
                  </div>
                </div>
              </div>

              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={course.imageUrl}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold mb-4">Course Content</h2>
                  <div className="space-y-3">
                    {course.modules.map((module) => (
                      <div
                        key={module.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <PlayCircle className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <h3 className="font-semibold">{module.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {module.lessons} lessons · {module.duration}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold mb-4">What You'll Learn</h2>
                  <div className="grid md:grid-cols-2 gap-3">
                    {course.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <div className="text-4xl font-bold text-primary mb-2">${course.price}</div>
                    <p className="text-sm text-muted-foreground">One-time payment · Lifetime access</p>
                  </div>

                  <div className="space-y-3">
                    <Button className="w-full" size="lg">
                      Purchase Course
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Payment integration requires Lovable Cloud
                    </p>
                  </div>

                  <div className="border-t pt-6 space-y-3">
                    <h3 className="font-semibold mb-3">This course includes:</h3>
                    {course.features.slice(0, 5).map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-accent flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
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
