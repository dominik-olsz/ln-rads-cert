import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Microscope, Award, Users } from "lucide-react";
import lnradsLogo from "@/assets/lnrads-logo.jpg";
import heroBackground from "@/assets/hero-background.jpg";
const Hero = () => {
  return <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroBackground})` }} />
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/90 to-background/95 pointer-events-none" />
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-block">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Award className="h-4 w-4" />
              Official LN-RADS Certification
            </span>
          </div>
          
          <div className="flex justify-center mb-6">
            <img src={lnradsLogo} alt="LN-RADS" className="h-24 w-auto" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            LN-RADS
            <span className="block text-primary mt-2">Lymph Nodes Reporting and Data System</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform the way you diagnose lymph nodes with our innovative multiparametric approach. 
            Detect macrometastases as small as 2-3mm and improve diagnostic accuracy by over 20% compared to traditional methods.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Start Certification Course
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="#course-details">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-3xl mx-auto">
            <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card border">
              <Microscope className="h-8 w-8 text-primary" />
              <div className="text-center">
                <div className="font-bold text-2xl">100</div>
                <div className="text-sm text-muted-foreground">Certification Questions</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card border">
              <Award className="h-8 w-8 text-accent" />
              <div className="text-center">
                
                <div className="text-sm text-muted-foreground">Pass Rate Required</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card border">
              <Users className="h-8 w-8 text-primary" />
              <div className="text-center">
                <div className="font-bold text-2xl">US, CT, MR, PET</div>
                <div className="text-sm text-muted-foreground">All Modalities</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default Hero;