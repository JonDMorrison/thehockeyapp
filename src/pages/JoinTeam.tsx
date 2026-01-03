import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { teamPalettes } from "@/lib/themes";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/app/Toast";
import { Users, AlertCircle, ChevronRight, Loader2 } from "lucide-react";

interface TeamPreview {
  success: boolean;
  error?: string;
  team_id?: string;
  team_name?: string;
  season_label?: string;
  team_photo_url?: string;
  team_logo_url?: string;
  palette_id?: string;
}

const JoinTeam: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  // Preview team by token (public, no auth required)
  const { data: preview, isLoading, error } = useQuery({
    queryKey: ["team-preview", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("preview_team_by_invite", {
        invite_token: token,
      });

      if (error) throw error;
      return data as unknown as TeamPreview;
    },
    enabled: !!token,
  });

  // Apply team theme when preview loads
  useEffect(() => {
    if (preview?.success && preview.palette_id) {
      setTeamTheme(preview.palette_id);
    }
  }, [preview, setTeamTheme]);

  const palette = preview?.palette_id 
    ? teamPalettes.find((p) => p.id === preview.palette_id) 
    : null;

  if (isLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer className="min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full">
            <SkeletonCard />
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  // Invalid or expired invite
  if (error || !preview?.success) {
    return (
      <AppShell hideNav>
        <PageContainer className="min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full">
            <AppCard>
              <EmptyState
                icon={AlertCircle}
                title="Invalid Invite"
                description="This invite link is no longer valid. Ask your coach for a new one."
                action={{
                  label: "Go Home",
                  onClick: () => navigate("/"),
                }}
              />
            </AppCard>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  const handleJoin = () => {
    if (!isAuthenticated) {
      // Store token in sessionStorage to continue after auth
      sessionStorage.setItem("pendingJoinToken", token!);
      navigate("/auth");
    } else {
      navigate(`/join/${token}/player`);
    }
  };

  return (
    <AppShell hideNav>
      <PageContainer className="min-h-screen flex items-center justify-center">
        <div className="max-w-sm w-full">
          <AppCard
            className="text-center relative overflow-hidden"
            style={{
              background: palette
                ? `linear-gradient(135deg, hsl(${palette.primary} / 0.08), hsl(${palette.tertiary} / 0.03))`
                : undefined,
            }}
          >
            <Avatar
              src={preview.team_logo_url || preview.team_photo_url}
              fallback={preview.team_name || "T"}
              size="xl"
              className="mx-auto mb-4"
            />
            <AppCardTitle className="text-xl mb-1">
              {preview.team_name}
            </AppCardTitle>
            {preview.season_label && (
              <AppCardDescription className="mb-6">
                {preview.season_label}
              </AppCardDescription>
            )}

            <div className="p-4 rounded-lg bg-surface-muted mb-6">
              <p className="text-sm text-text-muted">
                You've been invited to join this team's training hub. Add your
                player to get started.
              </p>
            </div>

            <Button
              variant="team"
              size="xl"
              className="w-full"
              onClick={handleJoin}
            >
              <Users className="w-5 h-5" />
              Join Team
              <ChevronRight className="w-4 h-4" />
            </Button>
          </AppCard>

          <p className="text-xs text-text-muted text-center mt-4">
            {isAuthenticated
              ? "You'll select which player to add next."
              : "You'll sign in or create an account first."}
          </p>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default JoinTeam;
