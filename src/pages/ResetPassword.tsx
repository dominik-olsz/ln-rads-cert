import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import lnradsLogo from "@/assets/lnrads-logo.jpg";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const tokenHash = searchParams.get("token_hash");

  useEffect(() => {
    let cancelled = false;

    // token_hash flow: the email link stays on our own domain and we exchange
    // the hash for a recovery session here.
    if (tokenHash) {
      const type = searchParams.get("type");
      if (type && type !== "recovery") {
        setHasRecoverySession(false);
        setErrorMessage("This link isn't a password reset link. Please request a new reset email.");
        return;
      }

      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(({ error }) => {
          if (cancelled) return;
          if (error) {
            setHasRecoverySession(false);
            setErrorMessage(
              /expired|invalid|not found|already/i.test(error.message)
                ? "This reset link has expired or has already been used."
                : error.message,
            );
            return;
          }
          setHasRecoverySession(true);
        });

      return () => {
        cancelled = true;
      };
    }

    // Legacy flow: links already in inboxes deliver a session via the URL hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setHasRecoverySession(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setHasRecoverySession(!!session);
      if (!session) {
        setErrorMessage("This reset link is invalid or has expired.");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [tokenHash, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      if (/session|expired|jwt|token/i.test(error.message)) {
        setHasRecoverySession(false);
        setErrorMessage("Your reset session has expired. Please request a new reset email.");
      }
      return;
    }

    toast({ title: "Success", description: "Password updated. Please sign in with your new password." });
    await supabase.auth.signOut({ scope: "local" });
    navigate("/auth");
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex flex-col items-center gap-3 mb-2">
            <img src={lnradsLogo} alt="LN-RADS" className="h-16 w-auto" />
            <span className="text-2xl font-bold">LN-RADS Certification</span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Set a new password</CardTitle>
            <CardDescription>
              {hasRecoverySession === false
                ? "This reset link is invalid or has expired."
                : "Enter your new password below."}
            </CardDescription>
          </CardHeader>

          {hasRecoverySession === false ? (
            <CardFooter>
              <Button asChild className="w-full">
                <Link to="/auth">Back to sign in</Link>
              </Button>
            </CardFooter>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={isLoading || hasRecoverySession === null}>
                  {isLoading ? "Updating..." : "Update password"}
                </Button>
                <Link to="/auth" className="text-sm text-primary hover:underline">
                  Back to sign in
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
