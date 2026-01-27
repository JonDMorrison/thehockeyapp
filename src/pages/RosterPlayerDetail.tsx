import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Target,
  Heart,
  Trophy,
  Star,
  User,
  Image as ImageIcon,
  Share2,
} from "lucide-react";

interface SessionPhoto {
  id: string;
  storage_path: string;
  visibility: string;
  caption: string | null;
  created_at: string;
}

const RosterPlayerDetail: React.FC = () => {
  const { teamId, playerId } = useParams<{ teamId: string; playerId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { activeView, activePlayerId } = useActiveView();

  // Context-aware back navigation - go to roster, which will handle its own back navigation
  const handleBack = () => {
    navigate(`/teams/${teamId}/roster`);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch team
  const { data: team } = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .eq("id", teamId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!teamId,
  });

  // Fetch player via membership
  const { data: player, isLoading } = useQuery({
    queryKey: ["roster-player", teamId, playerId],
    queryFn: async () => {
      const { data: membership, error: membershipError } = await supabase
        .from("team_memberships")
        .select(`
          id,
          player_id,
          players (
            id,
            first_name,
            last_initial,
            birth_year,
            shoots,
            jersey_number,
            profile_photo_url,
            fav_nhl_city,
            fav_nhl_player,
            hockey_love,
            season_goals
          )
        `)
        .eq("team_id", teamId)
        .eq("player_id", playerId)
        .eq("status", "active")
        .single();

      if (membershipError) throw membershipError;
      return membership?.players;
    },
    enabled: !!user && !!teamId && !!playerId,
  });

  // Fetch shared photos (visibility = team_adults)
  const { data: sharedPhotos } = useQuery({
    queryKey: ["shared-photos", teamId, playerId],
    queryFn: async () => {
      // Get recent practice cards for this team
      const { data: cards } = await supabase
        .from("practice_cards")
        .select("id")
        .eq("team_id", teamId!)
        .order("date", { ascending: false })
        .limit(10);

      if (!cards || cards.length === 0) return [];

      const cardIds = cards.map((c) => c.id);

      const { data, error } = await supabase
        .from("session_photos")
        .select("*")
        .in("practice_card_id", cardIds)
        .eq("player_id", playerId!)
        .eq("visibility", "team_adults")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as SessionPhoto[];
    },
    enabled: !!user && !!teamId && !!playerId,
  });

  const getPhotoUrl = (storagePath: string) => {
    const { data } = supabase.storage.from("session-photos").getPublicUrl(storagePath);
    return data.publicUrl;
  };

  // Show loading state while auth or data is loading
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

  // If not authenticated, render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  if (!player) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <AppCard>
            <EmptyState
              icon={User}
              title="Player not found"
              description="This player is not on this team."
              action={{
                label: "Back to Roster",
                onClick: () => navigate(`/teams/${teamId}/roster`),
              }}
            />
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleBack}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <PageHeader
            title={`${player.first_name} ${player.last_initial || ""}.`}
            subtitle={team?.name}
          />
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

        {/* Fun Stuff */}
        {(player.fav_nhl_city || player.fav_nhl_player || player.hockey_love || player.season_goals) && (
          <AppCard>
            <AppCardTitle className="text-base flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-team-primary" />
              About {player.first_name}
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

        {/* Shared Photos */}
        {sharedPhotos && sharedPhotos.length > 0 && (
          <AppCard>
            <AppCardTitle className="text-base flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-team-primary" />
              Recent Photos
            </AppCardTitle>
            <div className="grid grid-cols-3 gap-2">
              {sharedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-surface-muted"
                >
                  <img
                    src={getPhotoUrl(photo.storage_path)}
                    alt="Session photo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 right-1 w-5 h-5 bg-team-primary/80 rounded-full flex items-center justify-center">
                    <Share2 className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted text-center mt-3">
              Photos shared by guardians
            </p>
          </AppCard>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default RosterPlayerDetail;
