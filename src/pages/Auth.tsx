import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/app/Toast";
import { Loader2, Mail, Lock, User, ChevronLeft } from "lucide-react";

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
        const { error } = await signIn(email, password);
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-team-primary" />
      </div>
    );
  }

  return (
    <AppShell hideNav>
      <PageContainer className="min-h-screen flex flex-col justify-center">
        <div className="max-w-sm mx-auto w-full">
          {/* Logo/Brand area */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-team-primary/10 flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 rounded-lg bg-team-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Hockey Training</h1>
            <p className="text-text-muted text-sm mt-1">
              {mode === "signin" ? "Welcome back" : "Create your parent account"}
            </p>
          </div>

          <AppCard>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-text-muted" />
                    Your Name
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="First and last name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={errors.displayName ? "border-destructive" : ""}
                    autoComplete="name"
                  />
                  {errors.displayName && (
                    <p className="text-xs text-destructive">{errors.displayName}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-text-muted" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                  autoComplete="email"
                  autoFocus
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-text-muted" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? "border-destructive" : ""}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="team"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "signin" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setErrors({});
                }}
                className="text-sm text-team-primary hover:underline"
              >
                {mode === "signin"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </AppCard>

          {/* Back to home link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to home
            </button>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default Auth;
