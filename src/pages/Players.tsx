import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, UserPlus } from "lucide-react";

const Players: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const { data: players, isLoading } = useQuery({
    queryKey: ["players", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select(`
          *,
          player_guardians!inner(guardian_role)
        `)
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
        <PageHeader
          title="Players"
          subtitle="Manage your player profiles"
          action={
            <Button
              variant="team"
              size="sm"
              onClick={() => navigate("/players/new")}
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          }
        />
      }
    >
      <PageContainer>
        {isLoading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : players && players.length > 0 ? (
          <div className="space-y-3">
            {players.map((player) => {
              const isOwner = player.player_guardians?.some(
                (pg: { guardian_role: string }) => pg.guardian_role === "owner"
              );
              
              return (
                <AppCard
                  key={player.id}
                  className="cursor-pointer hover:shadow-medium transition-shadow"
                  onClick={() => navigate(`/players/${player.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={player.profile_photo_url}
                      fallback={`${player.first_name} ${player.last_initial || ""}`}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">
                        {player.first_name} {player.last_initial && `${player.last_initial}.`}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Tag variant="neutral" size="sm">
                          Born {player.birth_year}
                        </Tag>
                        {player.shoots && player.shoots !== "unknown" && (
                          <Tag variant="accent" size="sm">
                            {player.shoots === "left" ? "L" : "R"}
                          </Tag>
                        )}
                        {player.jersey_number && (
                          <Tag variant="tier" size="sm">
                            #{player.jersey_number}
                          </Tag>
                        )}
                        {!isOwner && (
                          <Tag variant="neutral" size="sm">
                            Guardian
                          </Tag>
                        )}
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
              icon={UserPlus}
              title="No players yet"
              description="Add your first player to start tracking their training and development."
              action={{
                label: "Add Player",
                onClick: () => navigate("/players/new"),
              }}
            />
          </AppCard>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default Players;
