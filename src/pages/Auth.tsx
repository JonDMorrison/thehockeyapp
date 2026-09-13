import React, { useCallback, useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/app/Toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Lock, User, ChevronLeft } from "lucide-react";
import { AppleButton } from "@/components/ui/apple-button";
import logoImage from "@/assets/hockey-app-logo.png";
import { getSelectedRole, clearSelectedRole } from "@/components/marketing/GetStartedModal";
import { MarketingNav } from "@/components/marketing/MarketingNav";

// Helper to get the redirect path based on stored role
const getRedirectPath = (): string => {
  const role = getSelectedRole();
  if (role === "coach") {
    clearSelectedRole();
    return "/teams/new";
  } else if (role === "solo") {
    clearSelectedRole();
    return "/solo/setup";
  } else if (role === "player") {
    clearSelectedRole();
    return "/players/new";
  }
  // No stored role, go to welcome for role selection
  return "/welcome";
};

const emailSchema = z.string().trim().email("Please enter a valid email address").max(255);

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Please enter your password").max(128),
});

const signUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  displayName: z.string().trim().max(100).optional(),
});

const resetSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type AuthMode = "signin" | "signup" | "reset";

const Auth: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(() => {
    const m = searchParams.get("mode");
    return m === "signup" || m === "reset" ? m : "signin";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const requestedRedirect = searchParams.get("redirect");
  const getPostAuthPath = useCallback(
    () => requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : getRedirectPath(),
    [requestedRedirect],
  );

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading && mode !== "reset") {
      navigate(getPostAuthPath(), { replace: true });
    }
  }, [isAuthenticated, authLoading, mode, navigate, getPostAuthPath]);

  const validate = () => {
    try {
      const values = mode === "reset"
        ? { password, confirmPassword }
        : { email, password, displayName: mode === "signup" ? displayName : undefined };
      const schema = mode === "reset" ? resetSchema : mode === "signup" ? signUpSchema : signInSchema;
      schema.parse(values);
      if (mode === "signup" && !acceptedTerms) {
        setErrors({ terms: "Please agree to the Terms and Privacy Policy" });
        return false;
      }
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

  const handleForgotPassword = async () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth?mode=reset",
      });
      if (error) {
        toast.error(t("auth.forgotPasswordFailedTitle"), error.message);
      } else {
        toast.success(t("auth.forgotPasswordSentTitle"), t("auth.forgotPasswordSentMessage"));
      }
    } catch {
      toast.error(t("common.somethingWentWrong"), t("common.pleaseTryAgain"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          toast.error("Couldn't update password", error.message);
        } else {
          toast.success("Password updated", "You can now use your new password.");
          setPassword("");
          setConfirmPassword("");
          navigate("/welcome", { replace: true });
        }
      } else if (mode === "signup") {
        const { data, error } = await signUp(email, password, displayName || undefined);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error(t("auth.accountExistsTitle"), t("auth.accountExistsMessage"));
          } else {
            toast.error(t("auth.signUpFailedTitle"), error.message);
          }
        } else if (data.session) {
          toast.success(t("auth.welcomeTitle"), t("auth.accountCreatedMessage"));
          navigate(getPostAuthPath(), { replace: true });
        } else {
          toast.success("Check your email", "Confirm your email address to finish creating your account.");
          setMode("signin");
          setSearchParams({ mode: "signin" }, { replace: true });
          setPassword("");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error(t("auth.invalidCredentialsTitle"), t("auth.invalidCredentialsMessage"));
          } else {
            toast.error(t("auth.signInFailedTitle"), error.message);
          }
        } else {
          toast.success(t("auth.welcomeBackTitle"), t("auth.signedInMessage"));
          navigate(getPostAuthPath(), { replace: true });
        }
      }
    } catch {
      toast.error(t("common.somethingWentWrong"), t("common.pleaseTryAgain"));
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

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <MarketingNav />

      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-primary/15 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

      {/* Floating decorative elements */}
      <div className="absolute top-20 left-[10%] w-24 h-24 bg-primary/10 rounded-3xl rotate-12 blur-sm" />
      <div className="absolute bottom-32 right-[15%] w-16 h-16 bg-primary/15 rounded-2xl -rotate-12 blur-sm" />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-12 pt-24">
        <div className="max-w-md mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src={logoImage} alt={t("auth.logoAlt")} className="w-10 h-10 object-contain" />
              <span className="text-2xl font-bold text-foreground">{t("auth.appName")}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {mode === "signin"
                ? t("auth.signinHeadline")
                : mode === "signup"
                ? t("auth.signupHeadline")
                : "Choose a new password"}
            </h1>
            <p className="text-muted-foreground">
              {mode === "signin"
                ? t("auth.signinSubheadline")
                : mode === "signup"
                ? t("auth.signupSubheadline")
                : "Use at least 8 characters for your new password."}
            </p>
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground/70 mt-1">
                {t("auth.signupTagline")}
              </p>
            )}
          </div>

          {/* Form Card */}
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl shadow-primary/5 border border-border/50">
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm font-medium">
                    {t("auth.yourNameLabel")}
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder={t("auth.yourNamePlaceholder")}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={`pl-12 h-14 rounded-xl bg-background/50 border-border/50 text-base ${errors.displayName ? "border-destructive" : ""}`}
                      autoComplete="name"
                    />
                  </div>
                  {errors.displayName && (
                    <p className="text-xs text-destructive pl-1">{errors.displayName}</p>
                  )}
                </div>
              )}

              {mode !== "reset" && <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t("auth.emailLabel")}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-12 h-14 rounded-xl bg-background/50 border-border/50 text-base ${errors.email ? "border-destructive" : ""}`}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive pl-1">{errors.email}</p>
                )}
              </div>}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t("auth.passwordLabel")}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("auth.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-12 h-14 rounded-xl bg-background/50 border-border/50 text-base ${errors.password ? "border-destructive" : ""}`}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                </div>
              {errors.password && (
                <p className="text-xs text-destructive pl-1">{errors.password}</p>
              )}
              {mode === "signin" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={forgotLoading}
                    className="text-xs text-primary hover:text-primary/80 transition-colors mt-1"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>
              )}
            </div>

            {mode === "reset" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm new password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-12 h-14 rounded-xl bg-background/50 border-border/50 text-base ${errors.confirmPassword ? "border-destructive" : ""}`}
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive pl-1">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="acceptTerms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => {
                      setAcceptedTerms(checked === true);
                      if (checked === true) setErrors((current) => ({ ...current, terms: "" }));
                    }}
                    aria-describedby={errors.terms ? "terms-error" : undefined}
                    className="mt-0.5"
                  />
                  <Label htmlFor="acceptTerms" className="text-xs leading-5 text-muted-foreground font-normal">
                    I agree to the <Link to="/terms" className="text-primary hover:underline">Terms</Link> and acknowledge the <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  </Label>
                </div>
                {errors.terms && <p id="terms-error" className="text-xs text-destructive">{errors.terms}</p>}
              </div>
            )}


            <AppleButton
                type="submit"
                variant="primary"
                size="xl"
                className="w-full mt-6"
                disabled={loading}
                loading={loading}
              >
                {mode === "signin"
                  ? t("auth.signInButton")
                  : mode === "signup"
                  ? t("auth.createAccountButton")
                  : "Update password"}
              </AppleButton>
            </form>

            {/* Divider */}
            {mode !== "reset" && <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">{t("common.or")}</span>
              </div>
            </div>

            {/* Toggle mode */}
            <button
              type="button"
              onClick={() => {
                const nextMode = mode === "signin" ? "signup" : "signin";
                setMode(nextMode);
                setSearchParams({ mode: nextMode }, { replace: true });
                setErrors({});
              }}
              className="w-full py-3 text-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {mode === "signin"
                ? t("auth.noAccountPrompt")
                : t("auth.hasAccountPrompt")}
            </button>
            </>}
          </div>

          {/* Back to home link */}
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              {t("common.backToHome")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
