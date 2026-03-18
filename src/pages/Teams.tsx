import React, { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonTeamCard } from "@/components/app/Skeleton";
import { ContextSwitcher } from "@/components/app/ContextSwitcher";
import { PullToRefresh } from "@/components/app/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, Users, Shield } from "lucide-react";

const Teams: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const roleLabels: Record<string, string> = {
    head_coach: t("teams.role.headCoach"),
    assistant_coach: t("teams.role.assistantCoach"),
    manager: t("teams.role.manager"),
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["teams", user?.id] });
  }, [queryClient, user?.id]);

  const { data: teams, isLoading, isFetched } = useQuery({
    queryKey: ["teams", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_roles")
        .select(`
          role,
          teams (
            id,
            name,
            season_label,
            team_photo_url,
            team_logo_url,
            palette_id
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Show loading state while auth is checking
  if (authLoading) {
    return (
      <AppShell>
        <PageContainer>
          <SkeletonTeamCard />
          <SkeletonTeamCard />
        </PageContainer>
      </AppShell>
    );
  }

  // If not authenticated, render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  // Smart redirect: if user has exactly one team, skip the list
  if (isFetched && teams && teams.length === 1) {
    const team = teams[0].teams as { id: string } | null;
    if (team) {
      navigate(`/teams/${team.id}`, { replace: true });
      return null;
    }
  }

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between w-full">
          <PageHeader
            title={t("teams.list.title")}
            subtitle={t("teams.list.subtitle")}
          />
          <div className="flex items-center gap-2">
            <ContextSwitcher />
            <Button
              variant="team"
              size="sm"
              onClick={() => navigate("/teams/new")}
            >
              <Plus className="w-4 h-4" />
              {t("teams.list.create")}
            </Button>
          </div>
        </div>
      }
    >
      <PullToRefresh onRefresh={handleRefresh} isRefreshing={isLoading}>
        <PageContainer>
          {isLoading ? (
            <div className="space-y-3">
              <SkeletonTeamCard />
              <SkeletonTeamCard />
            </div>
          ) : teams && teams.length > 0 ? (
            <div className="space-y-3">
              {teams.map((teamRole) => {
                const team = teamRole.teams as {
                  id: string;
                  name: string;
                  season_label: string | null;
                  team_photo_url: string | null;
                  team_logo_url: string | null;
                  palette_id: string;
                } | null;

                if (!team) return null;

                return (
                  <AppCard
                    key={team.id}
                    className="cursor-pointer hover:shadow-medium transition-shadow"
                    onClick={() => navigate(`/teams/${team.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={team.team_logo_url || team.team_photo_url}
                        fallback={team.name}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{team.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {team.season_label && (
                            <Tag variant="neutral" size="sm">
                              {team.season_label}
                            </Tag>
                          )}
                          <Tag variant="accent" size="sm">
                            <Shield className="w-3 h-3" />
                            {roleLabels[teamRole.role] || teamRole.role}
                          </Tag>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted" />
                    </div>
                  </AppCard>
                );
              })}
            </div>
          ) : (
            <AppCard>
              <EmptyState
                icon={Users}
                title={t("teams.list.emptyTitle")}
                description={t("teams.list.emptyDescription")}
                action={{
                  label: t("teams.list.emptyAction"),
                  onClick: () => navigate("/teams/new"),
                }}
              />
            </AppCard>
          )}
        </PageContainer>
      </PullToRefresh>
    </AppShell>
  );
};

export default Teams;
