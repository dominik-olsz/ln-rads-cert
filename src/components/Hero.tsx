import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Microscope, Award, Users } from "lucide-react";
import lnradsLogo from "@/assets/lnrads-logo.jpg";

const Hero = () => {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-hero opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Badge with animation */}
          <div className="inline-block animate-fade-in">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-primary text-sm font-semibold shadow-sm">
              <Award className="h-4 w-4" />
              Official LN-RADS Certification
            </span>
          </div>
          
          {/* Logo with subtle animation */}
          <div className="flex justify-center mb-6 animate-scale-in">
            <div className="p-4 rounded-2xl bg-background/50 backdrop-blur-sm shadow-elegant">
              <img src={lnradsLogo} alt="LN-RADS" className="h-24 w-auto" />
            </div>
          </div>
          
          {/* Main heading with gradient text */}
          <div className="space-y-4 animate-slide-up">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              LN-RADS
            </h1>
            <p className="text-2xl md:text-4xl font-bold text-gradient">
              Lymph Nodes Reporting and Data System
            </p>
          </div>
          
          {/* Description with better spacing */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Transform the way you diagnose lymph nodes with our innovative multiparametric approach. 
            Detect macrometastases as small as <span className="font-semibold text-accent">2-3mm</span> and improve diagnostic accuracy by over <span className="font-semibold text-accent">20%</span> compared to traditional methods.
          </p>
          
          {/* Enhanced CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link to="/auth">
              <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                Start Certification Course
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="#course-details">
              <Button size="lg" variant="outline" className="gap-2 hover:scale-105 transition-all">
                Learn More
              </Button>
            </Link>
          </div>
          
          {/* Enhanced stat cards with hover effects */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="group flex flex-col items-center gap-3 p-8 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-primary/10 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1 backdrop-blur-sm">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Microscope className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <div className="font-bold text-3xl text-primary">100</div>
                <div className="text-sm text-muted-foreground font-medium">Certification Questions</div>
              </div>
            </div>
            
            <div className="group flex flex-col items-center gap-3 p-8 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-accent/10 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1 backdrop-blur-sm">
              <div className="p-3 rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <Award className="h-8 w-8 text-accent" />
              </div>
              <div className="text-center">
                <div className="font-bold text-3xl text-accent">80%</div>
                <div className="text-sm text-muted-foreground font-medium">Pass Rate Required</div>
              </div>
            </div>
            
            <div className="group flex flex-col items-center gap-3 p-8 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-primary/10 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1 backdrop-blur-sm">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <div className="font-bold text-xl text-primary">US, CT, MR, PET</div>
                <div className="text-sm text-muted-foreground font-medium">All Modalities</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
