import { Link } from "react-router-dom";
import { Mail, Linkedin, Twitter } from "lucide-react";
import lnradsLogo from "@/assets/lnrads-logo.jpg";

const Footer = () => {
  return (
    <footer className="border-t bg-gradient-subtle relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 py-12 relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo and description */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <img src={lnradsLogo} alt="LN-RADS" className="h-10 w-auto" />
              <span className="font-bold text-lg">LN-RADS Certification</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              The official certification program for the Lymph Nodes Reporting and Data System. 
              Advancing diagnostic accuracy in lymph node assessment.
            </p>
          </div>
          
          {/* Quick links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-primary transition-colors">Courses</Link>
              </li>
              <li>
                <Link to="/auth" className="hover:text-primary transition-colors">Sign In</Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
              </li>
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-primary transition-colors">Terms and Conditions</Link>
              </li>
            </ul>
          </div>

        </div>
        
        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} LN-RADS Certification. All rights reserved.</p>

          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
