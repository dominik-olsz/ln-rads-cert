import { Link } from "@/i18n/router";
import { useT } from "@/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import lnradsLogo from "@/assets/lnrads-logo.jpg";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Menu, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const t = useT();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
    };

    checkAdminRole();
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const navLinkClass = "text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-2";

  return (
    <header
      className={cn(
        "sticky top-0 lg:top-4 z-50 transition-transform duration-300 ease-in-out",
        !isVisible && "-translate-y-full lg:translate-y-0",
      )}
    >
      <nav
        className={cn(
          "container mx-auto px-4 h-20 flex items-center justify-between transition-colors duration-300",
          "bg-background border-b border-border/60",
          "lg:bg-background/80 lg:backdrop-blur-md lg:border lg:border-border/60 lg:rounded-3xl lg:shadow-nav",
        )}
      >
        <Link to="/" className="flex items-center gap-3 group cursor-pointer">
          <img
            src={lnradsLogo}
            alt="LN-RADS logo"
            className="h-14 w-auto p-1.5 bg-white rounded-lg border border-border/60 shadow-sm object-contain"
          />
          <div className="flex flex-col -space-y-1">
            <span className="text-foreground font-bold text-lg tracking-tight">LN-RADS</span>
            <span className="text-primary font-semibold text-[10px] uppercase tracking-[0.2em] hidden md:block">
              Eduradiology
            </span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-10">
          <a href="https://lnrads.com/our-team/" target="_blank" rel="noopener noreferrer" className={navLinkClass}>
            {t("About us")}
          </a>
          <a
            href="https://lnrads.com/from-internet/"
            target="_blank"
            rel="noopener noreferrer"
            className={navLinkClass}
          >
            {t("Publications")}
          </a>
          <a href="https://lnrads.com/contact-us/" target="_blank" rel="noopener noreferrer" className={navLinkClass}>
            {t("Contact")}
          </a>
          <Link
            to="/courses"
            className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors px-2 py-2"
          >
            {t("Courses")}
          </Link>
        </div>


        <div className="flex items-center gap-4">
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden lg:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors max-w-[220px]">
                    <span className="truncate">{user.email}</span>
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl">
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="cursor-pointer">
                      {t("Account Settings")}
                    </Link>
                  </DropdownMenuItem>
                  {!isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/payments" className="cursor-pointer">
                        {t("My Payments")}
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/dashboard" className="cursor-pointer">
                        {t("Admin")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {!isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer">
                        {t("My Dashboard")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    {t("Sign Out")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {isAdmin ? (
                <Link to="/admin/dashboard" className="hidden lg:inline-flex">
                  <Button variant="outline" className="rounded-xl border-2 hover:bg-muted transition-colors">
                    {t("Admin")}
                  </Button>
                </Link>
              ) : (
                <Link to="/dashboard" className="hidden lg:inline-flex">
                  <Button variant="outline" className="rounded-xl border-2 hover:bg-muted transition-colors">
                    {t("My Dashboard")}
                  </Button>
                </Link>
              )}
              <LanguageSwitcher className="hidden lg:inline-flex" />
              <Button
                variant="outline"
                onClick={signOut}
                className="hidden lg:inline-flex rounded-xl border-2 hover:bg-muted transition-colors"
              >
                {t("Sign Out")}
              </Button>

              {isAdmin ? (
                <Link to="/admin/dashboard" className="lg:hidden inline-flex">
                  <Button className="inline-flex items-center justify-center px-3 py-2 md:px-6 md:py-3 h-auto bg-foreground text-background font-semibold text-xs md:text-sm rounded-2xl transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-xl hover:shadow-primary/20 active:scale-95 shadow-lg">
                    {t("Admin")}
                  </Button>
                </Link>
              ) : (
                <Link to="/dashboard" className="lg:hidden inline-flex">
                  <Button className="inline-flex items-center justify-center px-3 py-2 md:px-6 md:py-3 h-auto bg-foreground text-background font-semibold text-xs md:text-sm rounded-2xl transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-xl hover:shadow-primary/20 active:scale-95 shadow-lg">
                    {t("Dashboard")}
                  </Button>
                </Link>
              )}

              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open navigation menu"
                    className="lg:hidden rounded-xl"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64 rounded-l-3xl">
                  <div className="flex flex-col gap-4 mt-8">
                    <div className="text-sm text-muted-foreground border-b pb-3 truncate">{user.email}</div>

                    <a
                      href="https://lnrads.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {t("Home")}
                    </a>
                    <a
                      href="https://lnrads.com/our-team/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {t("About us")}
                    </a>
                    <a
                      href="https://lnrads.com/from-internet/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {t("Publications")}
                    </a>
                    <a
                      href="https://lnrads.com/contact-us/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {t("Contact")}
                    </a>
                    <Link
                      to="/courses"
                      className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                    >
                      {t("Courses")}
                    </Link>
                    {!isAdmin && (
                      <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                        {t("My Dashboard")}
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/admin/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                        {t("Admin")}
                      </Link>
                    )}
                    <Link to="/account" className="text-sm font-medium hover:text-primary transition-colors">
                      {t("Account Settings")}
                    </Link>
                    {!isAdmin && (
                      <Link to="/payments" className="text-sm font-medium hover:text-primary transition-colors">
                        {t("My Payments")}
                      </Link>
                    )}

                    <LanguageSwitcher className="self-start" />
                    <Button variant="outline" onClick={signOut} className="justify-center border-2 rounded-xl">
                      {t("Sign Out")}
                    </Button>

                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden lg:inline-flex text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-2"
              >
                {t("Sign In")}
              </Link>
              <LanguageSwitcher className="hidden lg:inline-flex" />
              <Link to="/auth?tab=signup">
                <Button className="inline-flex items-center justify-center px-3 py-2 md:px-6 md:py-3 h-auto bg-foreground text-background font-semibold text-xs md:text-sm rounded-2xl transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-xl hover:shadow-primary/20 active:scale-95 shadow-lg">
                  {t("Get Started")}
                </Button>
              </Link>

              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open navigation menu"
                    className="lg:hidden rounded-xl"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64 rounded-l-3xl">
                  <div className="flex flex-col gap-4 mt-8">
                    <LanguageSwitcher className="self-start" />
                    <a
                      href="https://lnrads.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {t("Home")}
                    </a>
                    <a
                      href="https://lnrads.com/our-team/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {t("About us")}
                    </a>
                    <a
                      href="https://lnrads.com/from-internet/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {t("Publications")}
                    </a>
                    <a
                      href="https://lnrads.com/contact-us/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {t("Contact")}
                    </a>
                    <Link
                      to="/courses"
                      className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                    >
                      {t("Courses")}
                    </Link>
                    <Link to="/auth" className="text-sm font-medium hover:text-primary transition-colors">
                      {t("Sign In")}
                    </Link>
                    <Link to="/auth?tab=signup" className="text-sm font-medium hover:text-primary transition-colors">
                      {t("Get Started")}
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
