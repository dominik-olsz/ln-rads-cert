import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import CourseCard from "@/components/CourseCard";

const Index = () => {
  const featuredCourses = [
    {
      id: "1",
      title: "Chest X-Ray Interpretation Fundamentals",
      description: "Master the basics of chest radiography interpretation with comprehensive video lessons and practice cases.",
      price: 299,
      duration: "12 hours",
      students: 1240,
      level: "Beginner",
      imageUrl: "/placeholder.svg"
    },
    {
      id: "2",
      title: "Advanced CT Scan Analysis",
      description: "Deep dive into CT imaging techniques, protocols, and interpretation with real clinical cases.",
      price: 499,
      duration: "20 hours",
      students: 856,
      level: "Advanced",
      imageUrl: "/placeholder.svg"
    },
    {
      id: "3",
      title: "MRI Basics and Applications",
      description: "Comprehensive introduction to MRI physics, sequences, and diagnostic applications.",
      price: 399,
      duration: "15 hours",
      students: 1024,
      level: "Intermediate",
      imageUrl: "/placeholder.svg"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Courses</h2>
            <p className="text-muted-foreground">
              Start your radiology journey with our most popular courses, designed by expert radiologists.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCourses.map((course) => (
              <CourseCard key={course.id} {...course} />
            ))}
          </div>
        </div>
      </section>
      
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Why Choose RadiologyMaster?
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 pt-8">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg">Expert Content</h3>
                <p className="text-sm text-muted-foreground">
                  Created by certified radiologists with years of clinical experience
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg">Official Certificates</h3>
                <p className="text-sm text-muted-foreground">
                  Earn recognized certificates upon course completion
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg">Interactive Learning</h3>
                <p className="text-sm text-muted-foreground">
                  Videos, images, practice questions, and comprehensive tests
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
