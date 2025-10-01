import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Users, BookOpen, Award, Video, Image as ImageIcon, FileQuestion } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      
      <section id="course-details" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Course Overview</h2>
              <p className="text-lg text-muted-foreground">
                Complete LN-RADS certification program with comprehensive training materials
              </p>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-2xl">What You'll Learn</CardTitle>
                <CardDescription>Master the LN-RADS classification system for lymph node assessment</CardDescription>
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
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">AI-Supported Diagnosis</div>
                      <div className="text-sm text-muted-foreground">Enhanced consistency with histopathological findings</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card>
                <CardHeader>
                  <Video className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Video Lessons</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Expert-led video tutorials explaining each LN-RADS category with real clinical examples
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <ImageIcon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Radiological Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Detailed US, CT, MR, and PET images with annotations and diagnostic explanations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <FileQuestion className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Certification Test</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Complete a 100-question certification exam to earn your official LN-RADS certificate
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Why LN-RADS?
              </h2>
              <p className="text-lg text-muted-foreground">
                Revolutionary approach to lymph node diagnosis with proven clinical benefits
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Superior Detection Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Find over 20% more metastatic lymph nodes compared to traditional 10mm SAD size criteria. 
                    Detect macrometastases as small as 2-3mm using multiparametric morphological criteria.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Quick Evaluations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Heuristic assessment model ensures rapid evaluation without compromising accuracy. 
                    Streamline your workflow while maintaining diagnostic excellence.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Better Communication</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Simple, standardized system improves communication between radiologists and clinicians. 
                    Clear categorization facilitates better patient management decisions.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Universal Application</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Apply LN-RADS across all imaging modalities: Ultrasound, CT, MR, and PET. 
                    One system for all your lymph node assessment needs.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 text-center">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle className="text-2xl">Get Certified Today</CardTitle>
                  <CardDescription className="text-base">
                    Join radiologists and oncologists worldwide who are mastering the LN-RADS system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Self-paced learning</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <FileQuestion className="h-4 w-4 text-primary" />
                      <span>100-question certification test</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      <span>Official certificate</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-center">
                  <Link to="/auth">
                    <Button size="lg" className="gap-2">
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
    </div>
  );
};

export default Index;
