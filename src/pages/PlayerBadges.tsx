import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { ProgressBar } from "@/components/app/ProgressBar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { BadgeIcon } from "@/components/app/BadgeIcon";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Trophy, Target } from "lucide-react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";

interface Challenge {
  id: string;
  name: string;
  description: string;
  metric_type: string;
  target_value: number;
  badge_icon: string;
}

interface ChallengeProgress {
  challenge_id: string;
  current_value: number;
  completed: boolean;
  completed_at: string | null;
}

interface PlayerBadge {
  challenge_id: string;
  awarded_at: string;
}

const PlayerBadges: React.FC = () => {
  const { t } = useTranslation();
  const { id: playerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch player
  const { data: player } = useQuery({
    queryKey: ["player", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, first_name, last_initial, profile_photo_url")
        .eq("id", playerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!playerId,
  });

  // Fetch all active challenges
  const { data: challenges, isLoading: challengesLoading } = useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("is_active", true)
        .order("target_value", { ascending: true });

      if (error) throw error;
      return data as Challenge[];
    },
    enabled: !!user,
  });

  // Fetch player's progress
  const { data: progress } = useQuery({
    queryKey: ["player-challenge-progress", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_challenge_progress")
        .select("*")
        .eq("player_id", playerId);

      if (error) throw error;
      return data as ChallengeProgress[];
    },
    enabled: !!user && !!playerId,
  });

  // Fetch player's badges
  const { data: badges } = useQuery({
    queryKey: ["player-badges", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_badges")
        .select("*")
        .eq("player_id", playerId);

      if (error) throw error;
      return data as PlayerBadge[];
    },
    enabled: !!user && !!playerId,
  });

  // Create lookup maps
  const progressMap = new Map(progress?.map((p) => [p.challenge_id, p]) || []);
  const badgeMap = new Map(badges?.map((b) => [b.challenge_id, b]) || []);

  const earnedBadges = challenges?.filter((c) => badgeMap.has(c.id)) || [];
  const inProgress = challenges?.filter((c) => !badgeMap.has(c.id)) || [];

  // Show loading state while auth or data is loading
  if (challengesLoading || authLoading) {
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

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(`/players/${playerId}/home`)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <PageHeader
            title={t("players.badges.title")}
            subtitle={player ? t("players.badges.subtitle", { name: player.first_name }) : undefined}
          />
        </div>
      }
    >
      <Helmet><title>Badges | Hockey App</title></Helmet>
      <PageContainer>
        {/* Summary */}
        <AppCard className="text-center bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10 border-amber-500/20">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <BadgeIcon badgeIcon="trophy" size="lg" className="mx-auto mb-3" />
          </motion.div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
            {earnedBadges.length}
          </h2>
          <p className="text-text-muted">
            {t("players.badges.badgeCount", { count: earnedBadges.length })}
          </p>
        </AppCard>

        {/* Earned Badges */}
        <div>
          <AppCardTitle className="text-sm text-text-muted mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            {t("players.badges.earnedSection")}
          </AppCardTitle>
          {earnedBadges.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {earnedBadges.map((challenge, index) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                >
                  <AppCard className="text-center p-4 hover:shadow-lg transition-shadow">
                    <BadgeIcon
                      badgeIcon={challenge.badge_icon}
                      earned
                      size="md"
                      className="mx-auto mb-2"
                      animate={false}
                    />
                    <p className="text-xs font-semibold line-clamp-2">{challenge.name}</p>
                  </AppCard>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted py-2">
              {t("players.badges.noBadgesYet")}
            </p>
          )}
        </div>

        {/* In Progress */}
        {inProgress.length > 0 && (
          <div>
            <AppCardTitle className="text-sm text-text-muted mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              {t("players.badges.inProgressSection")}
            </AppCardTitle>
            <div className="space-y-3">
              {inProgress.map((challenge, index) => {
                const prog = progressMap.get(challenge.id);
                const currentValue = prog?.current_value || 0;
                const percentage = Math.min(
                  (currentValue / challenge.target_value) * 100,
                  100
                );

                return (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <AppCard className="hover:bg-accent/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <BadgeIcon
                          badgeIcon={challenge.badge_icon}
                          earned={false}
                          size="sm"
                          animate={false}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{challenge.name}</p>
                          <p className="text-xs text-text-muted mb-2">
                            {challenge.description}
                          </p>
                          <div className="space-y-1">
                            <ProgressBar value={percentage} />
                            <p className="text-xs text-text-muted text-right">
                              {currentValue.toLocaleString()} / {challenge.target_value.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </AppCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {challenges?.length === 0 && (
          <AppCard>
            <EmptyState
              icon={Trophy}
              title={t("players.badges.emptyTitle")}
              description={t("players.badges.emptyDescription")}
            />
          </AppCard>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default PlayerBadges;
