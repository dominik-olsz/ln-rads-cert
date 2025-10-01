import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import lnradsLogo from "@/assets/lnrads-logo.jpg";

const Navbar = () => {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={lnradsLogo} alt="LN-RADS" className="h-10 w-auto" />
          <span className="font-bold text-xl">LN-RADS Certification</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-6">
          <Link to="/courses" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
            Courses
          </Link>
          <Link to="/about" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
            About
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link to="/auth">
            <Button>Get Started</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
