import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const courseId = searchParams.get("course_id");
  const [status, setStatus] = useState<"pending" | "confirmed" | "timeout">("pending");

  useEffect(() => {
    if (!user || !courseId) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      const { data } = await supabase
        .from("course_purchases")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setStatus("confirmed");
        return;
      }
      if (attempts >= 15) {
        setStatus("timeout");
        return;
      }
      setTimeout(poll, 2000);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [user, courseId]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            {status === "pending" && (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <h1 className="text-2xl font-bold">Confirming your payment…</h1>
                <p className="text-muted-foreground text-sm">
                  This usually takes just a few seconds.
                </p>
              </>
            )}

            {status === "confirmed" && (
              <>
                <CheckCircle className="h-10 w-10 text-accent mx-auto" />
                <h1 className="text-2xl font-bold">Payment successful</h1>
                <p className="text-muted-foreground text-sm">
                  Your course is unlocked. Enjoy your training!
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Button onClick={() => navigate(`/training/${courseId}`)}>
                    Start training
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/dashboard">Go to dashboard</Link>
                  </Button>
                </div>
              </>
            )}

            {status === "timeout" && (
              <>
                <h1 className="text-2xl font-bold">Payment received</h1>
                <p className="text-muted-foreground text-sm">
                  We're still finalising your access. Refresh this page in a moment, or
                  check your dashboard.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Button onClick={() => window.location.reload()}>Refresh</Button>
                  <Button variant="outline" asChild>
                    <Link to="/dashboard">Go to dashboard</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;
