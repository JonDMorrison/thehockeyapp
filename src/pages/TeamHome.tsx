import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { teamPalettes } from "@/lib/themes";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Settings,
  UserPlus,
  Send,
  Calendar,
  Shield,
  Users,
  ChevronRight,
  ClipboardList,
  Zap,
  Layers,
} from "lucide-react";
import { InviteParentsModal } from "@/components/team/InviteParentsModal";
import { GameDayModal } from "@/components/team/GameDayModal";

const roleLabels: Record<string, string> = {
  head_coach: "Head Coach",
  assistant_coach: "Asst. Coach",
  manager: "Manager",
};

interface TeamRole {
  user_id: string;
  role: string;
  profiles?: {
    display_name: string | null;
    email: string | null;
  } | null;
}

const TeamHome: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showGameDayModal, setShowGameDayModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch team with roles
  const { data: team, isLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", id)
        .single();

      if (teamError) throw teamError;

      // Fetch team roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("team_roles")
        .select("user_id, role")
        .eq("team_id", id);

      if (rolesError) throw rolesError;

      // Fetch profiles for roles
      const userIds = rolesData.map((r) => r.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);

      const rolesWithProfiles = rolesData.map((r) => ({
        ...r,
        profiles: profilesData?.find((p) => p.user_id === r.user_id) || null,
      }));

      return { ...teamData, team_roles: rolesWithProfiles };
    },
    enabled: !!user && !!id,
  });

  // Apply team theme when team data loads
  useEffect(() => {
    if (team?.palette_id) {
      setTeamTheme(team.palette_id);
    }
  }, [team?.palette_id, setTeamTheme]);

  const currentUserRole = team?.team_roles?.find(
    (r: TeamRole) => r.user_id === user?.id
  )?.role;

  const palette = teamPalettes.find((p) => p.id === team?.palette_id);

  if (isLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  if (!team) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <AppCard>
            <EmptyState
              icon={Users}
              title="Team not found"
              description="This team doesn't exist or you don't have access."
              action={{
                label: "Go Back",
                onClick: () => navigate("/teams"),
              }}
            />
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  const teamRoles = (team.team_roles || []) as TeamRole[];

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate("/teams")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Avatar
              src={team.team_logo_url || team.team_photo_url}
              fallback={team.name}
              size="sm"
            />
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">{team.name}</h1>
              {team.season_label && (
                <p className="text-xs text-text-muted">{team.season_label}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(`/teams/${id}/settings`)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      }
    >
      <PageContainer>
        {/* Team Header Card */}
        <AppCard
          className="relative overflow-hidden"
          style={{
            background: palette
              ? `linear-gradient(135deg, hsl(${palette.primary} / 0.1), hsl(${palette.tertiary} / 0.05))`
              : undefined,
          }}
        >
          <div className="flex items-center gap-4">
            <Avatar
              src={team.team_logo_url || team.team_photo_url}
              fallback={team.name}
              size="xl"
            />
            <div>
              <h2 className="text-xl font-bold">{team.name}</h2>
              {team.season_label && (
                <p className="text-sm text-text-muted">{team.season_label}</p>
              )}
              {currentUserRole && (
                <Tag variant="accent" size="sm" className="mt-2">
                  <Shield className="w-3 h-3" />
                  {roleLabels[currentUserRole]}
                </Tag>
              )}
            </div>
          </div>
        </AppCard>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="action"
              className="flex-col h-auto py-4 gap-2"
              onClick={() => navigate(`/teams/${id}/builder`)}
            >
              <Layers className="w-5 h-5 text-team-primary" />
              <span className="text-xs">Week Builder</span>
            </Button>
            <Button
              variant="action"
              className="flex-col h-auto py-4 gap-2"
              onClick={() => navigate(`/teams/${id}/practice`)}
            >
              <ClipboardList className="w-5 h-5 text-team-primary" />
              <span className="text-xs">Practice Cards</span>
            </Button>
            <Button
              variant="action"
              className="flex-col h-auto py-4 gap-2"
              onClick={() => setShowGameDayModal(true)}
            >
              <Zap className="w-5 h-5 text-team-primary" />
              <span className="text-xs">Game Day</span>
            </Button>
            <Button
              variant="action"
              className="flex-col h-auto py-4 gap-2"
              onClick={() => setShowInviteModal(true)}
            >
              <UserPlus className="w-5 h-5 text-team-primary" />
              <span className="text-xs">Invite Parents</span>
            </Button>
          </div>
        </div>

        {/* Roster Link */}
        <AppCard
          className="cursor-pointer hover:shadow-medium transition-shadow"
          onClick={() => navigate(`/teams/${id}/roster`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-team-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-team-primary" />
              </div>
              <div>
                <p className="font-semibold">View Roster</p>
                <p className="text-xs text-text-muted">See players on this team</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-text-muted" />
          </div>
        </AppCard>

        {/* Adults */}
        <AppCard>
          <div className="flex items-center justify-between mb-4">
            <AppCardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-team-primary" />
              Coaches & Managers
            </AppCardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => navigate(`/teams/${id}/settings`)}
            >
              Manage
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-3">
            {teamRoles.map((role) => {
              const profile = role.profiles;
              const isCurrentUser = role.user_id === user?.id;

              return (
                <div
                  key={role.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted"
                >
                  <Avatar
                    fallback={profile?.display_name || profile?.email || "?"}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {profile?.display_name || profile?.email || "Unknown"}
                      {isCurrentUser && " (You)"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {roleLabels[role.role] || role.role}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </AppCard>

        {/* Team Log Placeholder */}
        <AppCard variant="muted">
          <AppCardTitle className="text-base mb-1">Team Log</AppCardTitle>
          <AppCardDescription>
            Activity and updates will appear here once the team is in use.
          </AppCardDescription>
        </AppCard>
      </PageContainer>

      {/* Invite Parents Modal */}
      <InviteParentsModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        teamId={id!}
        teamName={team?.name || ""}
      />

      {/* Game Day Modal */}
      <GameDayModal
        open={showGameDayModal}
        onOpenChange={setShowGameDayModal}
        teamId={id!}
        teamName={team?.name || ""}
      />
    </AppShell>
  );
};

export default TeamHome;
