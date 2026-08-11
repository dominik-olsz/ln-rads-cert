import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, MailX } from "lucide-react";
import Navbar from "@/components/Navbar";

type State = "loading" | "valid" | "invalid" | "already" | "done";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setState("invalid");
        return;
      }
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.valid === false) {
          setState(data?.reason === "already_used" ? "already" : "invalid");
          return;
        }
        setEmail(data?.email ?? null);
        setState(data?.used_at ? "already" : "valid");
      } catch {
        setState("invalid");
      }
    };
    validate();
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      setState("done");
    } catch {
      setState("invalid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-16 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {state === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <MailX className="h-5 w-5 text-primary" />
              )}
              {state === "done" ? "You have been unsubscribed" : "Unsubscribe from emails"}
            </CardTitle>
            <CardDescription>
              {state === "loading" && "Checking your link…"}
              {state === "valid" &&
                `Confirm that ${email ?? "this address"} should no longer receive emails from LN-RADS Certification.`}
              {state === "already" && "This address is already unsubscribed."}
              {state === "invalid" && "This unsubscribe link is invalid or has expired."}
              {state === "done" &&
                "We will not send you any further emails. Invoices remain available in My payments."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state === "loading" ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : state === "valid" ? (
              <Button onClick={confirm} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm unsubscribe
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <a href="/">Back to home</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
