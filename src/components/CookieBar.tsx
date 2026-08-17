import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { Link } from "@/i18n/router";

const STORAGE_KEY = "lnrads_cookie_acknowledged";

const CookieBar = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const acknowledged = localStorage.getItem(STORAGE_KEY);
    if (!acknowledged) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                We use only necessary cookies
              </p>
              <p>
                This platform stores only the technical data needed to keep you signed in,
                secure your session and process payments. We do not use tracking or advertising cookies.{" "}
                <Link
                  to="/privacy-policy"
                  className="underline text-primary hover:text-primary/80"
                  onClick={() => setVisible(false)}
                >
                  Read more in our Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
          <Button
            onClick={handleAccept}
            className="shrink-0 rounded-xl bg-foreground text-background hover:bg-primary hover:text-primary-foreground"
          >
            I understand
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBar;
