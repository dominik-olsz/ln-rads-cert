import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import lnradsLogo from "@/assets/lnrads-logo.jpg";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.365 1.43c0 1.14-.42 2.24-1.18 3.05-.82.88-2.13 1.56-3.22 1.47-.14-1.1.42-2.26 1.16-3.03.83-.87 2.24-1.5 3.24-1.49zM20.5 17.42c-.55 1.27-.81 1.84-1.52 2.96-.99 1.57-2.39 3.52-4.12 3.54-1.54.02-1.94-1-4.03-1-2.09.01-2.53 1.02-4.07 1-1.73-.02-3.06-1.78-4.05-3.34C.06 16.4-.24 11.5 1.62 8.89c1.32-1.85 3.4-2.94 5.36-2.94 1.99 0 3.24 1.09 4.89 1.09 1.6 0 2.57-1.09 4.88-1.09 1.74 0 3.59.95 4.91 2.58-4.31 2.36-3.61 8.52-1.16 8.89z"/>
  </svg>
);


const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a link to reset your password." });
      setShowForgot(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(signInEmail, signInPassword);
    setIsLoading(false);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Signed in successfully"
      });
      navigate("/");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signUp(signUpEmail, signUpPassword, signUpName);
    setIsLoading(false);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Account created successfully! You can now sign in."
      });
    }
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex flex-col items-center gap-3 mb-2">
            <img src={lnradsLogo} alt="LN-RADS" className="h-16 w-auto" />
            <span className="text-2xl font-bold">LN-RADS Certification</span>
          </Link>
          <p className="text-muted-foreground">Welcome to your certification journey</p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={isLoading}
            onClick={async () => {
              setIsLoading(true);
              const result = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (result.error) {
                setIsLoading(false);
                toast({ title: "Error", description: result.error.message, variant: "destructive" });
                return;
              }
              if (result.redirected) return;
              navigate("/");
            }}
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={isLoading}
            onClick={async () => {
              setIsLoading(true);
              const result = await lovable.auth.signInWithOAuth("apple", {
                redirect_uri: window.location.origin,
              });
              if (result.error) {
                setIsLoading(false);
                toast({ title: "Error", description: result.error.message, variant: "destructive" });
                return;
              }
              if (result.redirected) return;
              navigate("/");
            }}
          >
            <AppleIcon />
            Continue with Apple
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card>
              {showForgot ? (
                <>
                  <CardHeader>
                    <CardTitle>Reset password</CardTitle>
                    <CardDescription>Enter your email and we'll send you a reset link.</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleForgotPassword}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email">Email</Label>
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="name@example.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Sending..." : "Send reset link"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setShowForgot(false)}
                        className="text-sm text-primary hover:underline"
                      >
                        Back to sign in
                      </button>
                    </CardFooter>
                  </form>
                </>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle>Sign In</CardTitle>
                    <CardDescription>Enter your credentials to access your account</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleSignIn}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="name@example.com"
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password">Password</Label>
                          <button
                            type="button"
                            onClick={() => {
                              setForgotEmail(signInEmail);
                              setShowForgot(true);
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <Input
                          id="signin-password"
                          type="password"
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          required
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </CardFooter>
                  </form>
                </>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Sign up to start your LN-RADS certification</CardDescription>
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="name@example.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>


        <div className="text-center">
          <Link to="/" className="text-sm text-primary hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
