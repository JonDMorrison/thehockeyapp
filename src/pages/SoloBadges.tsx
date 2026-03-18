import { useTranslation } from 'react-i18next';
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Trophy, Target, Calendar, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { BadgeIcon } from "@/components/app/BadgeIcon";
import { EmptyState } from "@/components/app/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
}

interface PlayerBadge {
  challenge_id: string;
  awarded_at: string;
}

export default function SoloBadges() {
  const { t } = useTranslation();
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Badge categories defined inside component so t() is available
  const BADGE_CATEGORIES = [
    {
      id: 'consistency',
      label: t('solo.badgeCategoryConsistency'),
      icon: Calendar,
      metricTypes: ['sessions_completed'],
      description: t('solo.badgeCategoryConsistencyDesc'),
      gradient: 'from-indigo-500 to-violet-600',
    },
    {
      id: 'shooting',
      label: t('solo.badgeCategoryShooting'),
      icon: Target,
      metricTypes: ['total_shots'],
      description: t('solo.badgeCategoryShootingDesc'),
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'gameday',
      label: t('solo.badgeCategoryGameReady'),
      icon: Zap,
      metricTypes: ['game_day_completed', 'prep_tasks_completed'],
      description: t('solo.badgeCategoryGameReadyDesc'),
      gradient: 'from-yellow-500 to-green-500',
    },
  ];

  // Fetch player
  const { data: player } = useQuery({
    queryKey: ['player', playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name')
        .eq('id', playerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });

  // Fetch all active challenges
  const { data: challenges, isLoading } = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('target_value', { ascending: true });
      if (error) throw error;
      return data as Challenge[];
    },
  });

  // Fetch player's progress
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['player-challenge-progress', playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_challenge_progress')
        .select('*')
        .eq('player_id', playerId);
      if (error) throw error;
      return data as ChallengeProgress[];
    },
    enabled: !!playerId,
  });

  // Fetch player's earned badges
  const { data: badges, isLoading: badgesLoading } = useQuery({
    queryKey: ['player-badges', playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_badges')
        .select('*')
        .eq('player_id', playerId);
      if (error) throw error;
      return data as PlayerBadge[];
    },
    enabled: !!playerId,
  });

  // Create lookup maps
  const progressMap = new Map(progress?.map(p => [p.challenge_id, p]) || []);
  const badgeMap = new Map(badges?.map(b => [b.challenge_id, b]) || []);

  const totalEarned = badges?.length || 0;
  const totalChallenges = challenges?.length || 0;

  if (isLoading || authLoading || progressLoading || badgesLoading) {
    return (
      <AppShell>
        <div className="p-5 space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => navigate(`/solo/dashboard/${playerId}`)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('solo.badges')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('solo.playerAchievements', { name: player?.first_name })}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 space-y-6 pb-8">
          {/* Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6 text-center"
          >
            <BadgeIcon badgeIcon="trophy" size="lg" className="mx-auto mb-3" />
            <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
              {totalEarned}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('solo.ofNBadgesEarned', { total: totalChallenges })}
            </p>

            {/* Progress bar */}
            <div className="mt-4 w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${totalChallenges > 0 ? (totalEarned / totalChallenges) * 100 : 0}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
          </motion.div>

          {/* Empty state when no challenges exist across any category */}
          {challenges !== undefined && BADGE_CATEGORIES.every(cat =>
            (challenges?.filter(c => cat.metricTypes.includes(c.metric_type)) || []).length === 0
          ) && (
            <EmptyState
              icon={Trophy}
              title={t('solo.badgesEmptyTitle')}
              description={t('solo.badgesEmptyDescription')}
            />
          )}

          {/* Categories */}
          {BADGE_CATEGORIES.map((category) => {
            const categoryBadges = challenges?.filter(c =>
              category.metricTypes.includes(c.metric_type)
            ) || [];

            if (categoryBadges.length === 0) return null;

            const earnedInCategory = categoryBadges.filter(c => badgeMap.has(c.id));
            const CategoryIcon = category.icon;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * BADGE_CATEGORIES.indexOf(category) }}
              >
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
                    category.gradient
                  )}>
                    <CategoryIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground">{category.label}</h2>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                  <div className="px-2 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {earnedInCategory.length}/{categoryBadges.length}
                  </div>
                </div>

                {/* Badges Grid */}
                <div className="space-y-3">
                  {categoryBadges.map((challenge, index) => {
                    const isEarned = badgeMap.has(challenge.id);
                    const prog = progressMap.get(challenge.id);
                    const currentValue = prog?.current_value || 0;
                    const percentage = Math.min((currentValue / challenge.target_value) * 100, 100);

                    return (
                      <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * index }}
                        className={cn(
                          "bg-card border rounded-xl p-4 transition-all",
                          isEarned
                            ? "border-primary/30 shadow-sm hover:shadow-md"
                            : "border-border hover:bg-accent/30"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Badge Icon */}
                          <BadgeIcon
                            badgeIcon={challenge.badge_icon}
                            earned={isEarned}
                            size="md"
                            animate={false}
                          />

                          {/* Badge Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className={cn(
                                "font-medium text-sm",
                                isEarned ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {challenge.name}
                              </p>
                              {isEarned && (
                                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {challenge.description}
                            </p>

                            {/* Progress */}
                            {!isEarned && (
                              <div className="space-y-1">
                                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                  <motion.div
                                    className="bg-primary/60 h-1.5 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.5, delay: 0.1 * index }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground text-right">
                                  {currentValue.toLocaleString()} / {challenge.target_value.toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
