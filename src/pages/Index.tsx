import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Users, BookOpen, Award, Video, Image as ImageIcon, FileQuestion } from "lucide-react";
const Index = () => {
  return <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      
      <section id="course-details" className="py-16 md:py-24 bg-gradient-subtle relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold">Course Overview</h2>
              <div className="h-1 w-24 bg-gradient-to-r from-primary to-accent mx-auto rounded-full" />
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Complete LN-RADS certification program with comprehensive training materials
              </p>
            </div>

            <Card className="mb-8 shadow-card hover:shadow-card-hover transition-all border-primary/10">
              <CardHeader className="space-y-3">
                <CardTitle className="text-2xl md:text-3xl">What You'll Learn</CardTitle>
                <CardDescription className="text-base">Master the LN-RADS classification system for lymph node assessment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">LN-RADS 1: Normal Lymph Nodes</div>
                      <div className="text-sm text-muted-foreground">No enlargement, oval shape, regular cortex ≤3mm</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">LN-RADS 2: Steatotic LN</div>
                      <div className="text-sm text-muted-foreground">Enlarged with hyperechoic hilum, no architectural changes</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">LN-RADS 3: Reactive LN</div>
                      <div className="text-sm text-muted-foreground">Thickened cortex &gt;3mm, preserved oval shape and medulla</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">LN-RADS 4: Suspicious LN</div>
                      <div className="text-sm text-muted-foreground">4a (low) and 4b (high) suspicion categories</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">LN-RADS 5: Malignant LN</div>
                      <div className="text-sm text-muted-foreground">Evident features of malignancy with FCT, necrosis</div>
                    </div>
                  </div>
                  
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="group border-primary/10 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1">
                <CardHeader className="space-y-4">
                  <div className="p-4 rounded-xl bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
                    <Video className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Video Lessons</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Expert-led video tutorials explaining each LN-RADS category with real clinical examples
                  </p>
                </CardContent>
              </Card>

              <Card className="group border-accent/10 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1">
                <CardHeader className="space-y-4">
                  <div className="p-4 rounded-xl bg-accent/10 w-fit group-hover:bg-accent/20 transition-colors">
                    <ImageIcon className="h-8 w-8 text-accent" />
                  </div>
                  <CardTitle className="text-xl">Radiological Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Detailed US, CT, MR, and PET images with annotations and diagnostic explanations
                  </p>
                </CardContent>
              </Card>

              <Card className="group border-primary/10 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1">
                <CardHeader className="space-y-4">
                  <div className="p-4 rounded-xl bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
                    <FileQuestion className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Certification Test</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Complete a 100-question certification exam to earn your official LN-RADS certificate
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-16 md:py-24 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold">
                Why LN-RADS?
              </h2>
              <div className="h-1 w-24 bg-gradient-to-r from-primary to-accent mx-auto rounded-full" />
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Revolutionary approach to lymph node diagnosis with proven clinical benefits
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="group border-primary/20 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1">
                <CardHeader className="space-y-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Superior Detection Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Find over <span className="font-semibold text-accent">20%</span> more metastatic lymph nodes compared to traditional 10mm SAD size criteria. 
                    Detect macrometastases as small as <span className="font-semibold text-accent">2-3mm</span> using multiparametric morphological criteria.
                  </p>
                </CardContent>
              </Card>

              <Card className="group border-accent/20 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1">
                <CardHeader className="space-y-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Clock className="w-7 h-7 text-accent" />
                  </div>
                  <CardTitle className="text-xl">Quick Evaluations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Heuristic assessment model ensures rapid evaluation without compromising accuracy. 
                    Streamline your workflow while maintaining diagnostic excellence.
                  </p>
                </CardContent>
              </Card>

              <Card className="group border-accent/20 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1">
                <CardHeader className="space-y-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-7 h-7 text-accent" />
                  </div>
                  <CardTitle className="text-xl">Better Communication</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Simple, standardized system improves communication between radiologists and clinicians. 
                    Clear categorization facilitates better patient management decisions.
                  </p>
                </CardContent>
              </Card>

              <Card className="group border-primary/20 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1">
                <CardHeader className="space-y-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Universal Application</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Apply LN-RADS across all imaging modalities: Ultrasound, CT, MR, and PET. 
                    One system for all your lymph node assessment needs.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-16 text-center">
              <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-primary/20 shadow-elegant overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                
                <CardHeader className="relative space-y-4 pt-12">
                  <div className="p-4 rounded-2xl bg-gradient-accent w-fit mx-auto">
                    <Award className="h-12 w-12 text-white" />
                  </div>
                  <CardTitle className="text-2xl md:text-3xl">Get Certified Today</CardTitle>
                  <CardDescription className="text-base md:text-lg">
                    Join radiologists and oncologists worldwide who are mastering the LN-RADS system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 relative">
                  <div className="grid md:grid-cols-3 gap-6 text-sm">
                    <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 backdrop-blur-sm">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium">Self-paced learning</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 backdrop-blur-sm">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <FileQuestion className="h-5 w-5 text-accent" />
                      </div>
                      <span className="font-medium">100-question test</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 backdrop-blur-sm">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium">Official certificate</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-center pb-12 relative">
                  <Link to="/auth">
                    <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                      Enroll Now
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>;
};
export default Index;