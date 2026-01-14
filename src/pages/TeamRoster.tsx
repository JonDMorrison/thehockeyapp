import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, UserPlus } from "lucide-react";
import { InviteParentsModal } from "@/components/team/InviteParentsModal";
import { AddPlayerChoice } from "@/components/dashboard/AddPlayerChoice";

interface Membership {
  id: string;
  player_id: string;
  status: string;
  joined_at: string;
  players?: {
    id: string;
    first_name: string;
    last_initial: string | null;
    birth_year: number;
    shoots: string | null;
    jersey_number: string | null;
    profile_photo_url: string | null;
  } | null;
}

const TeamRoster: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteModalTab, setInviteModalTab] = useState<"add-child" | "invite">("add-child");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch team
  const { data: team } = useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, season_label")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch roster (memberships with player data)
  const { data: memberships, isLoading } = useQuery({
    queryKey: ["team-roster", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select(`
          id,
          player_id,
          status,
          joined_at,
          players (
            id,
            first_name,
            last_initial,
            birth_year,
            shoots,
            jersey_number,
            profile_photo_url
          )
        `)
        .eq("team_id", id)
        .eq("status", "active")
        .order("joined_at", { ascending: true });

      if (error) throw error;
      return data as Membership[];
    },
    enabled: !!user && !!id,
  });

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

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(`/teams/${id}`)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <PageHeader
              title="Roster"
              subtitle={team?.name}
            />
          </div>
          <Button
            variant="team"
            size="sm"
            onClick={() => {
              setInviteModalTab("add-child");
              setShowInviteModal(true);
            }}
          >
            <UserPlus className="w-4 h-4" />
            Add Player
          </Button>
        </div>
      }
    >
      <PageContainer>
        {memberships && memberships.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">
              {memberships.length} player{memberships.length !== 1 ? "s" : ""} on the team
            </p>
            {memberships.map((membership) => {
              const player = membership.players;
              if (!player) return null;

              return (
                <AppCard 
                  key={membership.id}
                  className="cursor-pointer hover:bg-surface-muted/50 transition-colors"
                  onClick={() => navigate(`/teams/${id}/roster/${player.id}`)}
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
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-text-muted rotate-180" />
                  </div>
                </AppCard>
              );
            })}
          </div>
        ) : (
          <AddPlayerChoice
            onAddMyChild={() => {
              setInviteModalTab("add-child");
              setShowInviteModal(true);
            }}
            onInviteFamilies={() => {
              setInviteModalTab("invite");
              setShowInviteModal(true);
            }}
            className="mt-4"
          />
        )}
      </PageContainer>

      <InviteParentsModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        teamId={id || ""}
        teamName={team?.name || ""}
        initialTab={inviteModalTab}
      />
    </AppShell>
  );
};

export default TeamRoster;
