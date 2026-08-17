import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "@/i18n/router";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Home, BookOpen, Compass } from "lucide-react";
import { useT } from "@/i18n";

const NotFound = () => {
  const location = useLocation();
  const t = useT();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${t("Page not found")} | LN-RADS`}
        description={t("The page you are looking for does not exist or has been moved.")}
        path="/404"
        noindex
      />
      <Navbar />

      <main className="container mx-auto flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-8 w-8" />
        </div>

        <p className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-6xl font-bold tracking-tight text-transparent sm:text-7xl">
          404
        </p>

        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{t("Page not found")}</h1>

        <p className="mt-3 max-w-md text-muted-foreground">
          {t("The page you are looking for does not exist or has been moved.")}
        </p>

        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/" className="w-full sm:w-auto">
            <Button className="w-full" size="lg">
              <Home className="mr-2 h-4 w-4" />
              {t("Back to Home")}
            </Button>
          </Link>
          <Link to="/courses" className="w-full sm:w-auto">
            <Button className="w-full" size="lg" variant="outline">
              <BookOpen className="mr-2 h-4 w-4" />
              {t("Browse Courses")}
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
