import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { Tag } from "@/components/app/Tag";
import { SkeletonRoster } from "@/components/app/Skeleton";
import { BadgeIcon } from "@/components/app/BadgeIcon";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProgressBar } from "@/components/app/ProgressBar";
import { TeamCheerButton } from "./TeamCheerButton";
import { Users, Trophy, Target, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TeammateRosterProps {
  teamId: string;
  currentPlayerId: string;
}

interface Teammate {
  playerId: string;
  firstName: string;
  lastInitial: string | null;
  photoUrl: string | null;
  jerseyNumber: string | null;
  badgeCount: number;
  currentStreak: number;
}

interface Badge {
  id: string;
  name: string;
  badgeIcon: string;
  awardedAt: string;
}

interface ChallengeProgress {
  challengeId: string;
  name: string;
  badgeIcon: string;
  currentValue: number;
  targetValue: number;
}


export const TeammateRoster: React.FC<TeammateRosterProps> = ({
  teamId,
  currentPlayerId,
}) => {
  const { t } = useTranslation();
  const [selectedTeammate, setSelectedTeammate] = useState<Teammate | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Fetch teammates with badge counts
  const { data: teammates, isLoading } = useQuery({
    queryKey: ["teammates-with-badges", teamId],
    queryFn: async () => {
      // Get team memberships
      const { data: memberships, error: membershipError } = await supabase
        .from("team_memberships")
        .select(`
          player_id,
          players (
            id,
            first_name,
            last_initial,
            profile_photo_url,
            jersey_number
          )
        `)
        .eq("team_id", teamId)
        .eq("status", "active");

      if (membershipError) throw membershipError;

      // Get badge counts for all players
      const playerIds = memberships?.map((m) => m.player_id) || [];

      const { data: badges, error: badgeError } = await supabase
        .from("player_badges")
        .select("player_id")
        .in("player_id", playerIds);

      if (badgeError) throw badgeError;

      // Count badges per player
      const badgeCounts = new Map<string, number>();
      badges?.forEach((b) => {
        badgeCounts.set(b.player_id, (badgeCounts.get(b.player_id) || 0) + 1);
      });

      return (memberships || [])
        .map((m) => ({
          playerId: m.player_id,
          firstName: m.players?.first_name || "Unknown",
          lastInitial: m.players?.last_initial || null,
          photoUrl: m.players?.profile_photo_url || null,
          jerseyNumber: m.players?.jersey_number || null,
          badgeCount: badgeCounts.get(m.player_id) || 0,
          currentStreak: 0,
        }))
        .sort((a, b) => b.badgeCount - a.badgeCount) as Teammate[];
    },
    enabled: !!teamId,
  });

  // Fetch selected teammate's badges
  const { data: selectedBadges } = useQuery({
    queryKey: ["teammate-badges", selectedTeammate?.playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_badges")
        .select(`
          id,
          awarded_at,
          challenges (
            id,
            name,
            badge_icon
          )
        `)
        .eq("player_id", selectedTeammate!.playerId)
        .order("awarded_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((b) => ({
        id: b.id,
        name: b.challenges?.name || "Unknown Badge",
        badgeIcon: b.challenges?.badge_icon || "trophy",
        awardedAt: b.awarded_at || "",
      })) as Badge[];
    },
    enabled: !!selectedTeammate,
  });

  // Fetch selected teammate's challenge progress
  const { data: selectedProgress } = useQuery({
    queryKey: ["teammate-progress", selectedTeammate?.playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_challenge_progress")
        .select(`
          challenge_id,
          current_value,
          completed,
          challenges (
            id,
            name,
            badge_icon,
            target_value
          )
        `)
        .eq("player_id", selectedTeammate!.playerId)
        .eq("completed", false);

      if (error) throw error;

      return (data || [])
        .filter((p) => p.challenges)
        .map((p) => ({
          challengeId: p.challenge_id,
          name: p.challenges?.name || "Unknown",
          badgeIcon: p.challenges?.badge_icon || "target",
          currentValue: p.current_value || 0,
          targetValue: p.challenges?.target_value || 100,
        })) as ChallengeProgress[];
    },
    enabled: !!selectedTeammate,
  });

  if (isLoading) {
    return <SkeletonRoster />;
  }

  const otherTeammates = teammates?.filter((t) => t.playerId !== currentPlayerId) || [];
  const displayedTeammates = showAll ? otherTeammates : otherTeammates.slice(0, 5);

  return (
    <>
      <AppCard>
        <div className="flex items-center justify-between mb-3">
          <AppCardTitle className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-team-primary" />
            {t("players.teammateRoster.title", { count: otherTeammates.length })}
          </AppCardTitle>
          {otherTeammates.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-team-primary"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? t("common.showLess") : t("common.viewAll")}
            </Button>
          )}
        </div>

        {otherTeammates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("players.teammateRoster.noTeammates")}
          </p>
        ) : (
          <div className="space-y-2">
            {displayedTeammates.map((teammate) => (
              <div
                key={teammate.playerId}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedTeammate(teammate)}
                >
                  <Avatar
                    src={teammate.photoUrl}
                    fallback={`${teammate.firstName} ${teammate.lastInitial || ""}`}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {teammate.firstName} {teammate.lastInitial && `${teammate.lastInitial}.`}
                    </p>
                    <div className="flex items-center gap-2">
                      {teammate.jerseyNumber && (
                        <span className="text-xs text-muted-foreground">
                          #{teammate.jerseyNumber}
                        </span>
                      )}
                      {teammate.badgeCount > 0 && (
                        <span className="text-xs text-amber-600 flex items-center gap-0.5">
                          <Trophy className="w-3 h-3" />
                          {teammate.badgeCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Cheer button */}
                <TeamCheerButton
                  fromPlayerId={currentPlayerId}
                  toPlayerId={teammate.playerId}
                  toPlayerName={teammate.firstName}
                  teamId={teamId}
                  variant="icon"
                />
                <ChevronRight
                  className="w-4 h-4 text-muted-foreground cursor-pointer"
                  onClick={() => setSelectedTeammate(teammate)}
                />
              </div>
            ))}

          </div>
        )}
      </AppCard>

      {/* Teammate Profile Sheet */}
      <Sheet open={!!selectedTeammate} onOpenChange={() => setSelectedTeammate(null)}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader className="text-center">
            <div className="flex flex-col items-center gap-3 pb-4">
              <Avatar
                src={selectedTeammate?.photoUrl}
                fallback={`${selectedTeammate?.firstName || ""} ${selectedTeammate?.lastInitial || ""}`}
                size="xl"
              />
              <div>
                <SheetTitle className="text-xl">
                  {selectedTeammate?.firstName} {selectedTeammate?.lastInitial && `${selectedTeammate.lastInitial}.`}
                </SheetTitle>
                {selectedTeammate?.jerseyNumber && (
                  <Tag variant="tier" className="mt-1">
                    #{selectedTeammate.jerseyNumber}
                  </Tag>
                )}
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6 py-4">
            {/* Earned Badges */}
            {selectedBadges && selectedBadges.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  {t("players.teammateRoster.badgesEarned", { count: selectedBadges.length })}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {selectedBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="text-center p-3 rounded-xl hover:bg-accent/50 transition-colors"
                    >
                      <BadgeIcon
                        badgeIcon={badge.badgeIcon}
                        earned
                        size="sm"
                        className="mx-auto mb-2"
                        animate={false}
                      />
                      <p className="text-xs font-medium line-clamp-2">{badge.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* In Progress */}
            {selectedProgress && selectedProgress.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {t("players.teammateRoster.workingOn")}
                </h3>
                <div className="space-y-3">
                  {selectedProgress.slice(0, 3).map((progress) => {
                    const percentage = Math.min(
                      (progress.currentValue / progress.targetValue) * 100,
                      100
                    );
                    return (
                      <div key={progress.challengeId} className="flex items-center gap-3">
                        <BadgeIcon
                          badgeIcon={progress.badgeIcon}
                          earned={false}
                          size="xs"
                          animate={false}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{progress.name}</p>
                          <ProgressBar value={percentage} className="h-1.5" />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(percentage)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {(!selectedBadges || selectedBadges.length === 0) &&
              (!selectedProgress || selectedProgress.length === 0) && (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {t("players.teammateRoster.noBadgesYet")}
                  </p>
                </div>
              )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
