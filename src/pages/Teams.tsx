import React, { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { ContextSwitcher } from "@/components/app/ContextSwitcher";
import { PullToRefresh } from "@/components/app/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, Users, Shield } from "lucide-react";

const roleLabels: Record<string, string> = {
  head_coach: "Head Coach",
  assistant_coach: "Asst. Coach",
  manager: "Manager",
};

const Teams: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["teams", user?.id] });
  }, [queryClient, user?.id]);

  const { data: teams, isLoading } = useQuery({
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

  if (authLoading) {
    return (
      <AppShell>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between w-full">
          <PageHeader
            title="Teams"
            subtitle="Manage your teams"
          />
          <div className="flex items-center gap-2">
            <ContextSwitcher />
            <Button
              variant="team"
              size="sm"
              onClick={() => navigate("/teams/new")}
            >
              <Plus className="w-4 h-4" />
              Create
            </Button>
          </div>
        </div>
      }
    >
      <PullToRefresh onRefresh={handleRefresh} isRefreshing={isLoading}>
        <PageContainer>
          {isLoading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
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
                title="No teams yet"
                description="Create your first team to start managing practices and player development."
                action={{
                  label: "Create Team",
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
