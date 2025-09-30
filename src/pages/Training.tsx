import { useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

const Training = () => {
  const { courseId } = useParams();
  const [currentLesson, setCurrentLesson] = useState(0);

  // Mock training content - will be replaced with database data
  const lessons = [
    {
      id: 1,
      type: "video",
      title: "Introduction to Chest X-Ray Anatomy",
      content: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      description: "Learn the basic anatomical structures visible on a chest X-ray."
    },
    {
      id: 2,
      type: "image",
      title: "Normal Chest X-Ray Analysis",
      content: "/placeholder.svg",
      description: "Study a normal chest X-ray and identify key anatomical landmarks. Pay attention to the cardiac silhouette, lung fields, and mediastinal structures."
    },
    {
      id: 3,
      type: "quiz",
      title: "Practice Question 1",
      question: "What is the typical cardiothoracic ratio on a PA chest X-ray?",
      options: [
        "Less than 0.3",
        "Less than 0.5",
        "Between 0.5 and 0.7",
        "Greater than 0.7"
      ],
      correctAnswer: 1,
      explanation: "The normal cardiothoracic ratio should be less than 0.5 (50%) on a PA chest radiograph. A ratio greater than 0.5 suggests cardiomegaly."
    },
  ];

  const lesson = lessons[currentLesson];
  const progress = ((currentLesson + 1) / lessons.length) * 100;

  const handleNext = () => {
    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(currentLesson + 1);
    }
  };

  const handlePrevious = () => {
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">Course Training</h1>
            <span className="text-sm text-muted-foreground">
              Lesson {currentLesson + 1} of {lessons.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold mb-4">{lesson.title}</h2>
                
                {lesson.type === "video" && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4">
                    <iframe
                      className="w-full h-full"
                      src={lesson.content}
                      title={lesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {lesson.type === "image" && (
                  <div className="bg-muted rounded-lg overflow-hidden mb-4 p-4">
                    <img
                      src={lesson.content}
                      alt={lesson.title}
                      className="w-full max-h-[500px] object-contain"
                    />
                  </div>
                )}

                {lesson.type === "quiz" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-semibold mb-4">{lesson.question}</p>
                      <div className="space-y-2">
                        {lesson.options?.map((option, index) => (
                          <button
                            key={index}
                            className="w-full text-left p-3 rounded-lg border hover:bg-accent/10 transition-colors"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-accent/10 border border-accent rounded-lg">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm mb-1">Explanation:</p>
                          <p className="text-sm">{lesson.explanation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-muted-foreground mt-4">{lesson.description}</p>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentLesson === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={currentLesson === lessons.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Course Progress</h3>
                <div className="space-y-2">
                  {lessons.map((l, index) => (
                    <button
                      key={l.id}
                      onClick={() => setCurrentLesson(index)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        index === currentLesson
                          ? "bg-primary text-primary-foreground"
                          : index < currentLesson
                          ? "bg-accent/10 border-accent"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {index < currentLesson && (
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium line-clamp-1">{l.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Training;
