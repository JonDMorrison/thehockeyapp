import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Target,
  User,
  Image as ImageIcon,
  Share2,
} from "lucide-react";
import { PlayerCard, PlayerPersonality } from "@/components/player/PlayerCard";

interface SessionPhoto {
  id: string;
  storage_path: string;
  visibility: string;
  caption: string | null;
  created_at: string;
  signed_url: string;
}

const RosterPlayerDetail: React.FC = () => {
  const { t } = useTranslation();
  const { teamId, playerId } = useParams<{
    teamId: string;
    playerId: string;
  }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

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
  const {
    data: player,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["roster-player", teamId, playerId, user?.id],
    queryFn: async () => {
      const { data: membership, error: membershipError } = await supabase
        .from("team_memberships")
        .select(
          `
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
            position,
            fav_nhl_city,
            fav_nhl_player,
            hockey_love,
            season_goals
          )
        `,
        )
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
    queryKey: ["shared-photos", teamId, playerId, user?.id],
    queryFn: async () => {
      // Get recent practice cards for this team
      const { data: cards, error: cardsError } = await supabase
        .from("practice_cards")
        .select("id")
        .eq("team_id", teamId!)
        .eq("program_source", "team")
        .order("date", { ascending: false })
        .limit(10);

      if (cardsError) throw cardsError;
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
      const photosWithUrls = await Promise.all(
        data.map(async (photo) => {
          const { data: signed, error: signedError } = await supabase.storage
            .from("session-photos")
            .createSignedUrl(photo.storage_path, 3600);
          if (signedError) throw signedError;
          return { ...photo, signed_url: signed.signedUrl };
        }),
      );

      return photosWithUrls as SessionPhoto[];
    },
    enabled: !!user && !!teamId && !!playerId,
  });

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

  if (isError) {
    return (
      <AppShell hideNav>
        <PageContainer className="max-w-4xl">
          <AppCard>
            <div role="alert" className="space-y-3">
              <h1 className="text-lg font-bold">Couldn’t load this player</h1>
              <p className="text-sm text-muted-foreground">
                Check your connection and try again. This profile may also be
                unavailable to your account.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void refetch()}>Try again</Button>
                <Button variant="outline" onClick={handleBack}>
                  Back to roster
                </Button>
              </div>
            </div>
          </AppCard>
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
              title={t("players.rosterDetail.notFoundTitle")}
              description={t("players.rosterDetail.notFoundDescription")}
              action={{
                label: t("players.rosterDetail.backToRoster"),
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
        <div className="flex min-w-0 items-center gap-3 [&_h1]:break-words [&_p]:break-words">
          <Button
            aria-label="Go back"
            variant="ghost"
            size="icon-sm"
            onClick={handleBack}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <PageHeader
              title={`${player.first_name}${player.last_initial ? ` ${player.last_initial}.` : ""}`}
              subtitle={team?.name}
            />
          </div>
        </div>
      }
    >
      <PageContainer className="max-w-4xl">
        <PlayerCard
          player={player}
          teamName={team?.name}
          action={
            <Button
              onClick={() => navigate(`/players/${playerId}/home`)}
              className="gap-2 rounded-xl"
            >
              <Target className="h-4 w-4" aria-hidden="true" />
              {t("players.rosterDetail.viewProgress")}
            </Button>
          }
        />
        <PlayerPersonality
          player={player}
          title={t("players.rosterDetail.aboutTitle", {
            name: player.first_name,
          })}
        />

        {/* Shared Photos */}
        {sharedPhotos && sharedPhotos.length > 0 && (
          <AppCard>
            <AppCardTitle className="text-base flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-primary" />
              {t("players.rosterDetail.recentPhotos")}
            </AppCardTitle>
            <div className="grid grid-cols-3 gap-2">
              {sharedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-surface-muted"
                >
                  <img
                    src={photo.signed_url}
                    alt={t("players.rosterDetail.sessionPhotoAlt")}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 right-1 w-5 h-5 bg-primary/80 rounded-full flex items-center justify-center">
                    <Share2 className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted text-center mt-3">
              {t("players.rosterDetail.photosSharedByGuardians")}
            </p>
          </AppCard>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default RosterPlayerDetail;
