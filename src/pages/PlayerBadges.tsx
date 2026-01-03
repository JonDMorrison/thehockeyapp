import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { ProgressBar } from "@/components/app/ProgressBar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Trophy,
  Target,
  Flame,
  Medal,
  CheckCircle,
  Calendar,
  Star,
  Award,
  Zap,
  Shield,
  Crown,
  Brain,
  Lock,
} from "lucide-react";

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

const iconMap: Record<string, React.ReactNode> = {
  target: <Target className="w-6 h-6" />,
  flame: <Flame className="w-6 h-6" />,
  trophy: <Trophy className="w-6 h-6" />,
  medal: <Medal className="w-6 h-6" />,
  "check-circle": <CheckCircle className="w-6 h-6" />,
  calendar: <Calendar className="w-6 h-6" />,
  star: <Star className="w-6 h-6" />,
  award: <Award className="w-6 h-6" />,
  zap: <Zap className="w-6 h-6" />,
  shield: <Shield className="w-6 h-6" />,
  crown: <Crown className="w-6 h-6" />,
  brain: <Brain className="w-6 h-6" />,
};

const PlayerBadges: React.FC = () => {
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
            title="Badges"
            subtitle={player ? `${player.first_name}'s achievements` : undefined}
          />
        </div>
      }
    >
      <PageContainer>
        {/* Summary */}
        <AppCard className="text-center">
          <div className="w-16 h-16 rounded-full bg-team-primary/10 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-8 h-8 text-team-primary" />
          </div>
          <h2 className="text-2xl font-bold">{earnedBadges.length}</h2>
          <p className="text-text-muted">
            badge{earnedBadges.length !== 1 ? "s" : ""} earned
          </p>
        </AppCard>

        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div>
            <AppCardTitle className="text-sm text-text-muted mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Earned
            </AppCardTitle>
            <div className="grid grid-cols-3 gap-3">
              {earnedBadges.map((challenge) => (
                <AppCard
                  key={challenge.id}
                  className="text-center p-4"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--team-primary) / 0.1), hsl(var(--team-secondary) / 0.05))",
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-team-primary/20 flex items-center justify-center mx-auto mb-2 text-team-primary">
                    {iconMap[challenge.badge_icon] || <Trophy className="w-6 h-6" />}
                  </div>
                  <p className="text-xs font-semibold line-clamp-2">{challenge.name}</p>
                </AppCard>
              ))}
            </div>
          </div>
        )}

        {/* In Progress */}
        {inProgress.length > 0 && (
          <div>
            <AppCardTitle className="text-sm text-text-muted mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              In Progress
            </AppCardTitle>
            <div className="space-y-3">
              {inProgress.map((challenge) => {
                const prog = progressMap.get(challenge.id);
                const currentValue = prog?.current_value || 0;
                const percentage = Math.min(
                  (currentValue / challenge.target_value) * 100,
                  100
                );

                return (
                  <AppCard key={challenge.id}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-text-muted shrink-0">
                        {iconMap[challenge.badge_icon] || <Lock className="w-5 h-5" />}
                      </div>
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
                );
              })}
            </div>
          </div>
        )}

        {challenges?.length === 0 && (
          <AppCard>
            <EmptyState
              icon={Trophy}
              title="No challenges available"
              description="Check back soon for new challenges!"
            />
          </AppCard>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default PlayerBadges;
