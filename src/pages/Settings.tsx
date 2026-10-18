import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChevronRight, User, Bell, HelpCircle, LogOut, FileText, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { CoachProfileSection } from "@/components/team/CoachProfileSection";
import { toast } from "@/components/app/Toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";

interface ProfileData {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url?: string | null;
}

interface EmailPreferences {
  weekly_coach_digest: boolean;
  player_weekly_progress: boolean;
  product_updates: boolean;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: associationRoles } = useQuery({
    queryKey: ["my-association-roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("association_roles")
        .select("association_id, role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const emailPreferences = useQuery({
    queryKey: ["email-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: existing, error } = await supabase
        .from("email_preferences")
        .select("weekly_coach_digest, player_weekly_progress, product_updates")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (existing) return existing as EmailPreferences;

      const { data: created, error: createError } = await supabase
        .from("email_preferences")
        .insert({ user_id: user.id })
        .select("weekly_coach_digest, player_weekly_progress, product_updates")
        .single();
      if (createError) throw createError;
      return created as EmailPreferences;
    },
    enabled: !!user,
  });

  const updateEmailPreference = useMutation({
    mutationFn: async ({ key, value }: { key: keyof EmailPreferences; value: boolean }) => {
      if (!user) throw new Error("Sign in to update email preferences");
      const { error } = await supabase
        .from("email_preferences")
        .upsert({ user_id: user.id, [key]: value }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-preferences", user?.id] }),
    onError: (error: Error) => toast.error("Could not save email preference", error.message),
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
  const hasAssociationAccess = (associationRoles?.length ?? 0) > 0;

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
      <Helmet><title>Settings | Hockey App</title></Helmet>
      <div className="px-5 py-6 space-y-6">
        {/* Contextual microcopy */}
        <p className="text-xs text-muted-foreground">
          Team work and home development are tracked separately.
        </p>
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

        {/* Community gift */}
        <section>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center space-y-1">
            <p className="text-sm font-medium text-foreground flex items-center justify-center gap-1.5"><Sparkles className="w-4 h-4" /> Free for the Hockey Community</p>
            <p className="text-xs text-muted-foreground">Every feature is included. No trial, subscription, or credit card.</p>
          </div>
        </section>

        {/* Profile Section */}
        <section>
          <CoachProfileSection isCoach={isCoach} />
        </section>

        {/* Communication preferences */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Email preferences
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            <PreferenceRow
              label="Coach weekly digest"
              description="A weekly team participation summary."
              checked={emailPreferences.data?.weekly_coach_digest ?? true}
              disabled={emailPreferences.isLoading || updateEmailPreference.isPending || !isCoach}
              onCheckedChange={(value) => updateEmailPreference.mutate({ key: "weekly_coach_digest", value })}
            />
            <PreferenceRow
              label="Player weekly progress"
              description="Sessions, shots, and streak progress for your players."
              checked={emailPreferences.data?.player_weekly_progress ?? true}
              disabled={emailPreferences.isLoading || updateEmailPreference.isPending}
              onCheckedChange={(value) => updateEmailPreference.mutate({ key: "player_weekly_progress", value })}
            />
            <PreferenceRow
              label="Product updates"
              description="Occasional news about meaningful Hockey App improvements."
              checked={emailPreferences.data?.product_updates ?? false}
              disabled={emailPreferences.isLoading || updateEmailPreference.isPending}
              onCheckedChange={(value) => updateEmailPreference.mutate({ key: "product_updates", value })}
            />
          </div>
        </section>

        {/* Association workspace */}
        {(isCoach || hasAssociationAccess) && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Association
            </h2>
            <div className="overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-r from-card to-primary/10">
              <SettingsRow
                icon={Building2}
                label="Association HQ"
                sublabel="Manage teams, rollout, staff, and adoption."
                onClick={() => navigate("/associations")}
              />
            </div>
          </section>
        )}

        {/* Support Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Support
          </h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            <SettingsRow
              icon={HelpCircle}
              label="About The Hockey App"
              onClick={() => window.open("/about", "_blank")}
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

function PreferenceRow({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
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
      {!disabled && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
    </button>
  );
}
