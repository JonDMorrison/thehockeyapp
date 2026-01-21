import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChevronRight, User, Shield, Bell, HelpCircle, LogOut, FileText } from "lucide-react";
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
  const { user, signOut, loading: authLoading } = useAuth();

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