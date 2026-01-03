import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/app/Toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  UserPlus,
  Trash2,
  Calendar,
  Target,
  Heart,
  Trophy,
  Star,
  Shield,
  User,
  Loader2,
} from "lucide-react";
import { InviteGuardianModal } from "@/components/player/InviteGuardianModal";

interface Guardian {
  user_id: string;
  guardian_role: string;
  profiles?: {
    display_name: string | null;
    email: string | null;
  } | null;
}

const PlayerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [guardianToRemove, setGuardianToRemove] = useState<Guardian | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch player with guardians
  const { data: player, isLoading } = useQuery({
    queryKey: ["player", id],
    queryFn: async () => {
      // Fetch player
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("*")
        .eq("id", id)
        .single();

      if (playerError) throw playerError;

      // Fetch guardians
      const { data: guardiansData, error: guardiansError } = await supabase
        .from("player_guardians")
        .select("user_id, guardian_role")
        .eq("player_id", id);

      if (guardiansError) throw guardiansError;

      // Fetch profiles for guardians
      const guardianUserIds = guardiansData.map((g) => g.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", guardianUserIds);

      // Combine guardian data with profiles
      const guardiansWithProfiles = guardiansData.map((g) => ({
        ...g,
        profiles: profilesData?.find((p) => p.user_id === g.user_id) || null,
      }));

      return { ...playerData, player_guardians: guardiansWithProfiles };
    },
    enabled: !!user && !!id,
  });

  // Fetch pending invites
  const { data: pendingInvites } = useQuery({
    queryKey: ["player-invites", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_guardian_invites")
        .select("*")
        .eq("player_id", id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const isOwner = player?.owner_user_id === user?.id ||
    player?.player_guardians?.some(
      (g: Guardian) => g.user_id === user?.id && g.guardian_role === "owner"
    );

  const removeGuardian = useMutation({
    mutationFn: async (guardian: Guardian) => {
      const { error } = await supabase
        .from("player_guardians")
        .delete()
        .eq("player_id", id)
        .eq("user_id", guardian.user_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", id] });
      toast.success("Guardian removed", "They no longer have access to this player.");
      setGuardianToRemove(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to remove guardian", error.message);
    },
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

  if (!player) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <AppCard>
            <EmptyState
              icon={User}
              title="Player not found"
              description="This player doesn't exist or you don't have access."
              action={{
                label: "Go Back",
                onClick: () => navigate("/players"),
              }}
            />
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  const guardians = (player.player_guardians || []) as Guardian[];

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/players")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">
              {player.first_name} {player.last_initial && `${player.last_initial}.`}
            </h1>
          </div>
        </div>
      }
    >
      <PageContainer>
        {/* Profile Header */}
        <AppCard className="text-center">
          <Avatar
            src={player.profile_photo_url}
            fallback={`${player.first_name} ${player.last_initial || ""}`}
            size="xl"
            className="mx-auto mb-4"
          />
          <h2 className="text-xl font-bold">
            {player.first_name} {player.last_initial && `${player.last_initial}.`}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <Tag variant="neutral">Born {player.birth_year}</Tag>
            {player.shoots && player.shoots !== "unknown" && (
              <Tag variant="accent">
                Shoots {player.shoots === "left" ? "Left" : "Right"}
              </Tag>
            )}
            {player.jersey_number && (
              <Tag variant="tier">#{player.jersey_number}</Tag>
            )}
          </div>
        </AppCard>

        {/* Basic Info */}
        <AppCard>
          <AppCardTitle className="text-base flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-team-primary" />
            Player Details
          </AppCardTitle>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-muted">Birth Year</p>
              <p className="font-medium">{player.birth_year}</p>
            </div>
            <div>
              <p className="text-text-muted">Shoots</p>
              <p className="font-medium capitalize">{player.shoots || "Unknown"}</p>
            </div>
            {player.jersey_number && (
              <div>
                <p className="text-text-muted">Jersey</p>
                <p className="font-medium">#{player.jersey_number}</p>
              </div>
            )}
          </div>
        </AppCard>

        {/* Fun Stuff */}
        {(player.fav_nhl_city || player.fav_nhl_player || player.hockey_love || player.season_goals) && (
          <AppCard>
            <AppCardTitle className="text-base flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-team-primary" />
              Fun Stuff
            </AppCardTitle>
            <div className="space-y-4 text-sm">
              {player.fav_nhl_city && (
                <div className="flex items-start gap-3">
                  <Trophy className="w-4 h-4 text-text-muted mt-0.5" />
                  <div>
                    <p className="text-text-muted">Favorite NHL City</p>
                    <p className="font-medium">{player.fav_nhl_city}</p>
                  </div>
                </div>
              )}
              {player.fav_nhl_player && (
                <div className="flex items-start gap-3">
                  <Star className="w-4 h-4 text-text-muted mt-0.5" />
                  <div>
                    <p className="text-text-muted">Favorite Player</p>
                    <p className="font-medium">{player.fav_nhl_player}</p>
                  </div>
                </div>
              )}
              {player.hockey_love && (
                <div className="flex items-start gap-3">
                  <Heart className="w-4 h-4 text-text-muted mt-0.5" />
                  <div>
                    <p className="text-text-muted">What They Love</p>
                    <p className="font-medium">{player.hockey_love}</p>
                  </div>
                </div>
              )}
              {player.season_goals && (
                <div className="flex items-start gap-3">
                  <Target className="w-4 h-4 text-text-muted mt-0.5" />
                  <div>
                    <p className="text-text-muted">Season Goals</p>
                    <p className="font-medium">{player.season_goals}</p>
                  </div>
                </div>
              )}
            </div>
          </AppCard>
        )}

        {/* Guardians */}
        <AppCard>
          <div className="flex items-center justify-between mb-4">
            <AppCardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-team-primary" />
              Guardians
            </AppCardTitle>
            {isOwner && (
              <Button
                variant="team-soft"
                size="sm"
                onClick={() => setShowInviteModal(true)}
              >
                <UserPlus className="w-4 h-4" />
                Invite
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {guardians.map((guardian) => {
              const profile = guardian.profiles as { display_name: string | null; email: string | null } | null;
              const isCurrentUser = guardian.user_id === user?.id;
              const canRemove = isOwner && !isCurrentUser && guardian.guardian_role !== "owner";

              return (
                <div
                  key={guardian.user_id}
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
                    <p className="text-xs text-text-muted capitalize">
                      {guardian.guardian_role}
                    </p>
                  </div>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setGuardianToRemove(guardian)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}

            {/* Pending Invites */}
            {isOwner && pendingInvites && pendingInvites.length > 0 && (
              <>
                <AppCardDescription className="mt-4 mb-2">
                  Pending Invites
                </AppCardDescription>
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-warning-muted/50 border border-warning/20"
                  >
                    <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {invite.invited_email}
                      </p>
                      <p className="text-xs text-text-muted">
                        Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Tag variant="warning" size="sm">
                      Pending
                    </Tag>
                  </div>
                ))}
              </>
            )}
          </div>
        </AppCard>
      </PageContainer>

      {/* Invite Guardian Modal */}
      <InviteGuardianModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        playerId={id!}
        playerName={player.first_name}
      />

      {/* Remove Guardian Confirmation */}
      <AlertDialog
        open={!!guardianToRemove}
        onOpenChange={(open) => !open && setGuardianToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Guardian</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this guardian? They will no longer
              have access to {player.first_name}'s profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => guardianToRemove && removeGuardian.mutate(guardianToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeGuardian.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default PlayerProfile;
