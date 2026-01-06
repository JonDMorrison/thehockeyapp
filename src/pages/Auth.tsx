import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/app/Toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Lock, User, ChevronLeft } from "lucide-react";
import { AppleButton } from "@/components/ui/apple-button";
import logoImage from "@/assets/hockey-app-logo.png";

const authSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  displayName: z.string().trim().max(100).optional(),
});

const Auth: React.FC = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/welcome", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const validate = () => {
    try {
      authSchema.parse({ email, password, displayName: mode === "signup" ? displayName : undefined });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password, displayName || undefined);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Account exists", "Try signing in instead.");
          } else {
            toast.error("Sign up failed", error.message);
          }
        } else {
          toast.success("Welcome!", "Your account has been created.");
          navigate("/welcome", { replace: true });
        }
      } else {
        const { error } = await signIn(email, password, rememberMe);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("Invalid credentials", "Please check your email and password.");
          } else {
            toast.error("Sign in failed", error.message);
          }
        } else {
          toast.success("Welcome back!", "You're now signed in.");
          navigate("/welcome", { replace: true });
        }
      }
    } catch {
      toast.error("Something went wrong", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
              }

              {mode === "signin" && (
                <div className="flex items-center gap-3 pt-1">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="rounded-md"
                  />
                  <Label 
                    htmlFor="rememberMe" 
                    className="text-sm text-muted-foreground cursor-pointer select-none"
                  >
                    Remember me
                  </Label>
                </div>
              )}

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-primary/15 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
      
      {/* Floating decorative elements */}
      <div className="absolute top-20 left-[10%] w-24 h-24 bg-primary/10 rounded-3xl rotate-12 blur-sm" />
      <div className="absolute bottom-32 right-[15%] w-16 h-16 bg-primary/15 rounded-2xl -rotate-12 blur-sm" />
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-12">
        <div className="max-w-md mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-10">
            {/* App Logo */}
            <div className="relative inline-block mb-6">
              <img 
                src={logoImage} 
                alt="Hockey App" 
                className="w-20 h-20 rounded-3xl shadow-lg shadow-primary/25"
              />
              <div className="absolute -inset-2 bg-primary/20 rounded-[28px] blur-xl -z-10 animate-pulse" />
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {mode === "signin" ? "Welcome back" : "Join Hockey App"}
            </h1>
            <p className="text-muted-foreground">
              {mode === "signin" 
                ? "Sign in to track your training progress" 
                : "Create your account to get started"}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl shadow-primary/5 border border-border/50">
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm font-medium">
                    Your Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="First and last name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={`pl-12 h-14 rounded-2xl bg-background/50 border-border/50 text-base ${errors.displayName ? "border-destructive" : ""}`}
                      autoComplete="name"
                    />
                  </div>
                  {errors.displayName && (
                    <p className="text-xs text-destructive pl-1">{errors.displayName}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-12 h-14 rounded-2xl bg-background/50 border-border/50 text-base ${errors.email ? "border-destructive" : ""}`}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive pl-1">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-12 h-14 rounded-2xl bg-background/50 border-border/50 text-base ${errors.password ? "border-destructive" : ""}`}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive pl-1">{errors.password}</p>
                )}
              </div>

              <AppleButton
                type="submit"
                variant="primary"
                size="xl"
                className="w-full mt-6"
                disabled={loading}
                loading={loading}
              >
                {mode === "signin" ? "Sign In" : "Create Account"}
              </AppleButton>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Toggle mode */}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setErrors({});
              }}
              className="w-full py-3 text-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {mode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>

          {/* Back to home link */}
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
