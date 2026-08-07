import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import lnradsLogo from "@/assets/lnrads-logo.jpg";

type ConfirmType = "signup" | "invite" | "magiclink" | "email_change";

const VALID_TYPES: ConfirmType[] = ["signup", "invite", "magiclink", "email_change"];

const SUCCESS_COPY: Record<ConfirmType, { title: string; description: string; to: string }> = {
  signup: {
    title: "Email confirmed",
    description: "Your email address is verified. Taking you to your dashboard...",
    to: "/dashboard",
  },
  invite: {
    title: "Invitation accepted",
    description: "You're signed in. Taking you to your dashboard...",
    to: "/dashboard",
  },
  magiclink: {
    title: "You're signed in",
    description: "Taking you to your dashboard...",
    to: "/dashboard",
  },
  email_change: {
    title: "Email change confirmed",
    description: "Your new email address is confirmed. Taking you to your account...",
    to: "/account",
  },
};

const AuthConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const type = VALID_TYPES.includes(rawType as ConfirmType) ? (rawType as ConfirmType) : null;

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!tokenHash || !type) {
        setStatus("error");
        setErrorMessage("This link is incomplete or malformed. Please request a new email.");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type === "email_change" ? "email_change" : type,
      });

      if (cancelled) return;

      if (error) {
        setStatus("error");
        setErrorMessage(
          /expired|invalid|not found|already/i.test(error.message)
            ? "This link has expired or has already been used."
            : error.message,
        );
        return;
      }

      setStatus("success");
      setTimeout(() => {
        if (!cancelled) navigate(SUCCESS_COPY[type].to, { replace: true });
      }, 1200);
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [tokenHash, type, navigate]);

  const retryTo = type === "email_change" ? "/account" : "/auth";
  const retryLabel = type === "email_change" ? "Back to account settings" : "Request a new email";

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
          {status === "verifying" && (
            <>
              <CardHeader>
                <CardTitle>Verifying your link</CardTitle>
                <CardDescription>One moment while we confirm this request.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Please wait...</CardContent>
            </>
          )}

          {status === "success" && type && (
            <CardHeader>
              <CardTitle>{SUCCESS_COPY[type].title}</CardTitle>
              <CardDescription>{SUCCESS_COPY[type].description}</CardDescription>
            </CardHeader>
          )}

          {status === "error" && (
            <>
              <CardHeader>
                <CardTitle>We couldn't confirm this link</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link to={retryTo}>{retryLabel}</Link>
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AuthConfirm;
