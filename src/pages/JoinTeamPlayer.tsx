import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { teamPalettes } from "@/lib/themes";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/app/Toast";
import {
  ChevronLeft,
  Plus,
  Check,
  CheckCircle,
  AlertCircle,
  Users,
  Loader2,
} from "lucide-react";

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

interface JoinResult {
  success: boolean;
  error?: string;
  membership_id?: string;
  team_id?: string;
  already_member?: boolean;
}

const JoinTeamPlayer: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [joinedPlayerName, setJoinedPlayerName] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      sessionStorage.setItem("pendingJoinToken", token!);
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, token]);

  // Check for pending join token after auth
  useEffect(() => {
    const pendingToken = sessionStorage.getItem("pendingJoinToken");
    if (pendingToken && pendingToken !== token) {
      sessionStorage.removeItem("pendingJoinToken");
    }
  }, [token]);

  // Preview team by token
  const { data: preview, isLoading: previewLoading } = useQuery({
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

  // Fetch parent's players
  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["players", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*, player_guardians!inner(guardian_role)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Apply team theme
  useEffect(() => {
    if (preview?.success && preview.palette_id) {
      setTeamTheme(preview.palette_id);
    }
  }, [preview, setTeamTheme]);

  // Join team mutation
  const joinTeam = useMutation({
    mutationFn: async (playerId: string) => {
      const { data, error } = await supabase.rpc("join_team_with_invite", {
        invite_token: token,
        p_player_id: playerId,
      });

      if (error) throw error;

      const result = data as unknown as JoinResult;
      if (!result.success) {
        throw new Error(result.error || "Failed to join team");
      }

      return result;
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["team-roster"] });
      queryClient.invalidateQueries({ queryKey: ["player-memberships", selectedPlayerId] });
      queryClient.invalidateQueries({ queryKey: ["player-preferences", selectedPlayerId] });

      const player = players?.find((p) => p.id === selectedPlayerId);
      setJoinedPlayerName(player?.first_name || "Player");
      setJoinSuccess(true);

      // Auto-set this team as active for the player
      if (result.team_id && selectedPlayerId) {
        try {
          await supabase
            .from("player_team_preferences")
            .upsert({
              player_id: selectedPlayerId,
              active_team_id: result.team_id,
              updated_at: new Date().toISOString(),
            });
        } catch (e) {
          // Non-critical, just log
          console.log("Failed to set active team:", e);
        }
      }

      if (result.already_member) {
        toast.info("Already joined", "This player is already on the team.");
      } else {
        toast.success("Welcome!", "Player joined the team.");
      }

      // Clear pending token
      sessionStorage.removeItem("pendingJoinToken");
    },
    onError: (error: Error) => {
      toast.error("Failed to join", error.message);
    },
  });

  const handleJoin = () => {
    if (!selectedPlayerId) {
      toast.error("Select a player", "Choose which player to add to the team.");
      return;
    }
    joinTeam.mutate(selectedPlayerId);
  };

  const handleAddNewPlayer = () => {
    // Store join context before navigating
    sessionStorage.setItem("pendingJoinToken", token!);
    sessionStorage.setItem("returnToJoin", "true");
    navigate("/players/new");
  };

  const isLoading = previewLoading || playersLoading || authLoading;

  if (isLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  // Invalid invite
  if (!preview?.success) {
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

  // Success state
  if (joinSuccess) {
    return (
      <AppShell hideNav>
        <PageContainer className="min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full">
            <AppCard className="text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <AppCardTitle className="text-xl mb-2">
                {joinedPlayerName} Joined!
              </AppCardTitle>
              <AppCardDescription className="mb-6">
                Successfully joined {preview.team_name}.
              </AppCardDescription>
              <div className="space-y-3">
                <Button
                  variant="team"
                  size="lg"
                  className="w-full"
                  onClick={() => navigate(`/players/${selectedPlayerId}/today`)}
                >
                  Go to Today's Workout
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => navigate(`/players/${selectedPlayerId}/home`)}
                >
                  View Dashboard
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setJoinSuccess(false);
                    setSelectedPlayerId(null);
                  }}
                >
                  Add Another Player
                </Button>
              </div>
            </AppCard>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  const palette = preview.palette_id
    ? teamPalettes.find((p) => p.id === preview.palette_id)
    : null;

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(`/join/${token}`)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <PageHeader title="Select Player" subtitle={`Join ${preview.team_name}`} />
        </div>
      }
    >
      <PageContainer>
        {/* Team preview */}
        <AppCard
          className="flex items-center gap-3"
          style={{
            background: palette
              ? `linear-gradient(135deg, hsl(${palette.primary} / 0.08), hsl(${palette.tertiary} / 0.03))`
              : undefined,
          }}
        >
          <Avatar
            src={preview.team_logo_url || preview.team_photo_url}
            fallback={preview.team_name || "T"}
            size="lg"
          />
          <div>
            <p className="font-semibold">{preview.team_name}</p>
            {preview.season_label && (
              <p className="text-sm text-text-muted">{preview.season_label}</p>
            )}
          </div>
        </AppCard>

        {/* Player selection */}
        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">
            Which player is joining?
          </h2>

          {players && players.length > 0 ? (
            <div className="space-y-3">
              {players.map((player) => (
                <AppCard
                  key={player.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedPlayerId === player.id
                      ? "ring-2 ring-team-primary ring-offset-2"
                      : ""
                  }`}
                  onClick={() => setSelectedPlayerId(player.id)}
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
                        {player.jersey_number && (
                          <Tag variant="tier" size="sm">
                            #{player.jersey_number}
                          </Tag>
                        )}
                      </div>
                    </div>
                    {selectedPlayerId === player.id && (
                      <div className="w-6 h-6 rounded-full bg-team-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </AppCard>
              ))}
            </div>
          ) : (
            <AppCard>
              <EmptyState
                icon={Users}
                title="No players yet"
                description="Create a player profile to join this team."
                action={{
                  label: "Add Player",
                  onClick: handleAddNewPlayer,
                }}
              />
            </AppCard>
          )}
        </div>

        {/* Add new player button */}
        {players && players.length > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleAddNewPlayer}
          >
            <Plus className="w-4 h-4" />
            Add New Player
          </Button>
        )}

        {/* Join button */}
        {players && players.length > 0 && (
          <Button
            variant="team"
            size="xl"
            className="w-full"
            onClick={handleJoin}
            disabled={!selectedPlayerId || joinTeam.isPending}
          >
            {joinTeam.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Join Team
          </Button>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default JoinTeamPlayer;
