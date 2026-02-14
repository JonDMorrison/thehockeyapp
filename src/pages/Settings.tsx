import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { getPlanLabel, FEATURE_LABELS, type EntitlementKey } from "@/core/entitlements";
import { ChevronRight, User, Shield, Bell, HelpCircle, LogOut, FileText, CreditCard, Crown, Check, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CoachProfileSection } from "@/components/team/CoachProfileSection";
import { toast } from "@/components/app/Toast";

interface ProfileData {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url?: string | null;
}

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut, loading: authLoading } = useAuth();
  const { isPro, plan, subscription, loading: entLoading } = useEntitlements();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Show toast on checkout return
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast.success("Welcome to Pro! Your features are being activated.");
      // Clean URL
      window.history.replaceState({}, "", "/settings");
    } else if (checkout === "cancelled") {
      toast.info("Checkout cancelled.");
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);

  const handleUpgrade = async () => {
    if (!user) return;
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      toast.error("Failed to start checkout. Please try again.");
      console.error("Checkout error:", err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      toast.error("Failed to open subscription management.");
      console.error("Portal error:", err);
    } finally {
      setPortalLoading(false);
    }
  };

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData | null>({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, email, avatar_url")
        .eq("user_id", user.id)
        .single();
      
      if (error) return null;
      return data as ProfileData;
    },
    enabled: !!user,
  });

  // Check if user has any coach roles
  const { data: coachRoles } = useQuery({
    queryKey: ["my-coach-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("team_roles")
        .select("team_id, role")
        .eq("user_id", user.id)
        .in("role", ["head_coach", "assistant_coach"]);
      return data || [];
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const isLoading = authLoading || profileLoading;
  const isCoach = (coachRoles?.length ?? 0) > 0;

  const header = (
    <div className="px-5 py-4 border-b border-border bg-background">
      <h1 className="text-xl font-semibold">Account & Profile</h1>
    </div>
  );

  if (isLoading) {
    return (
      <AppShell header={header}>
        <div className="p-5 space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell header={header}>
        <div className="p-5 text-center">
          <p className="text-muted-foreground mb-4">Please sign in to access settings</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell header={header}>
      <div className="px-5 py-6 space-y-6">
        {/* Account Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </h2>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={profile?.avatar_url}
                fallback={profile?.display_name || profile?.email || "U"}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {profile?.display_name || "User"}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </h2>
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            {/* Current Plan */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPro && <Crown className="h-5 w-5 text-amber-500" />}
                <div>
                  <p className="font-medium text-foreground">
                    {getPlanLabel(plan)} Plan
                  </p>
                  {isPro && subscription?.current_period_end && (
                    <p className="text-xs text-muted-foreground">
                      Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              {isPro && (
                <span className="text-xs font-medium bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full">
                  Active
                </span>
              )}
            </div>

            {/* Pro Features List */}
            {!isPro && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">Unlock with Pro ($15/mo):</p>
                {(Object.entries(FEATURE_LABELS) as [EntitlementKey, string][]).map(([, label]) => (
                  <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              {isPro ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Manage Subscription
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4 mr-2" />
                  )}
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Profile Section - Photo, Name, and Coach Bio (if coach) */}
        <section>
          <CoachProfileSection isCoach={isCoach} />
        </section>

        {/* Preferences Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Preferences
          </h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            <SettingsRow 
              icon={Bell} 
              label="Notifications" 
              sublabel="Coming soon"
              disabled 
            />
            <SettingsRow 
              icon={Shield} 
              label="Privacy" 
              sublabel="Coming soon"
              disabled 
            />
          </div>
        </section>

        {/* Support Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Support
          </h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            <SettingsRow 
              icon={HelpCircle} 
              label="Help & FAQ" 
              onClick={() => window.open("https://thehockeyapp.lovable.app/about", "_blank")}
            />
            <SettingsRow 
              icon={FileText} 
              label="Terms & Privacy" 
              onClick={() => navigate("/terms")}
            />
          </div>
        </section>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </AppShell>
  );
}

interface SettingsRowProps {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  disabled?: boolean;
}

function SettingsRow({ icon: Icon, label, sublabel, onClick, disabled }: SettingsRowProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      {!disabled && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}