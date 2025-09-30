import Navbar from "@/components/Navbar";
import CourseCard from "@/components/CourseCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

const Courses = () => {
  const courses = [
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
    {
      id: "4",
      title: "Ultrasound Imaging Techniques",
      description: "Learn ultrasound physics, scanning techniques, and diagnostic applications across various body systems.",
      price: 349,
      duration: "14 hours",
      students: 892,
      level: "Intermediate",
      imageUrl: "/placeholder.svg"
    },
    {
      id: "5",
      title: "Pediatric Radiology Essentials",
      description: "Specialized training in pediatric imaging techniques and interpretation of common pediatric conditions.",
      price: 449,
      duration: "18 hours",
      students: 567,
      level: "Advanced",
      imageUrl: "/placeholder.svg"
    },
    {
      id: "6",
      title: "Emergency Radiology",
      description: "Fast-paced course covering critical findings and rapid interpretation in emergency settings.",
      price: 399,
      duration: "16 hours",
      students: 734,
      level: "Advanced",
      imageUrl: "/placeholder.svg"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-12 border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">All Courses</h1>
          <p className="text-muted-foreground mb-8">
            Browse our comprehensive collection of radiology training courses
          </p>
          
          <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                className="pl-10"
              />
            </div>
            <Select>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
      
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} {...course} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Courses;
