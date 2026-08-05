import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import lnradsLogo from "@/assets/lnrads-logo.jpg";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!data);
    };

    checkAdminRole();
  }, [user]);

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={lnradsLogo} alt="LN-RADS" className="h-10 w-auto" />
          <span className="font-bold text-sm md:text-xl">LN-RADS Certification</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-6">
          <Link to="/courses" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
            Courses
          </Link>
          {user && !isAdmin && (
            <Link to="/dashboard" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              My Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/dashboard" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              Admin
            </Link>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user.email}
              </span>
              <Button variant="outline" onClick={signOut} className="hidden md:inline-flex">
                Sign Out
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex flex-col gap-4 mt-8">
                    <div className="text-sm text-muted-foreground border-b pb-3">
                      {user.email}
                    </div>
                    <Link to="/courses" className="text-sm font-medium hover:text-primary transition-colors">
                      Courses
                    </Link>
                    {!isAdmin && (
                      <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                        My Dashboard
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/admin/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                        Admin
                      </Link>
                    )}
                    <Button variant="outline" onClick={signOut} className="justify-center border-2 mt-4">
                      Sign Out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              <Link to="/auth" className="hidden md:inline-flex">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
