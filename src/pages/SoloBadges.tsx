import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChevronLeft, Trophy, Target, Flame, Medal, CheckCircle, Calendar, 
  Star, Award, Zap, Shield, Crown, Brain, Lock, Dumbbell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  target: Target,
  flame: Flame,
  trophy: Trophy,
  medal: Medal,
  'check-circle': CheckCircle,
  calendar: Calendar,
  star: Star,
  award: Award,
  zap: Zap,
  shield: Shield,
  crown: Crown,
  brain: Brain,
  dumbbell: Dumbbell,
};

// Badge categories
const BADGE_CATEGORIES = [
  { 
    id: 'consistency', 
    label: 'Consistency', 
    icon: Calendar,
    metricTypes: ['sessions_completed'],
    description: 'Show up and put in the work'
  },
  { 
    id: 'shooting', 
    label: 'Shooting', 
    icon: Target,
    metricTypes: ['total_shots'],
    description: 'Master your shot with reps'
  },
  { 
    id: 'gameday', 
    label: 'Game Ready', 
    icon: Zap,
    metricTypes: ['game_day_completed', 'prep_tasks_completed'],
    description: 'Be prepared for competition'
  },
];

export default function SoloBadges() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();

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
  const { data: progress } = useQuery({
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
  const { data: badges } = useQuery({
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

  if (isLoading) {
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
              <h1 className="text-xl font-bold text-foreground">Badges</h1>
              <p className="text-sm text-muted-foreground">
                {player?.first_name}'s achievements
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 space-y-6 pb-8">
          {/* Summary Card */}
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{totalEarned}</p>
            <p className="text-sm text-muted-foreground">
              of {totalChallenges} badges earned
            </p>
            
            {/* Progress bar */}
            <div className="mt-4 w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${totalChallenges > 0 ? (totalEarned / totalChallenges) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Categories */}
          {BADGE_CATEGORIES.map((category) => {
            const categoryBadges = challenges?.filter(c => 
              category.metricTypes.includes(c.metric_type)
            ) || [];
            
            if (categoryBadges.length === 0) return null;

            const earnedInCategory = categoryBadges.filter(c => badgeMap.has(c.id));
            const CategoryIcon = category.icon;

            return (
              <div key={category.id}>
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CategoryIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground">{category.label}</h2>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {earnedInCategory.length}/{categoryBadges.length}
                  </span>
                </div>

                {/* Badges Grid */}
                <div className="space-y-3">
                  {categoryBadges.map((challenge) => {
                    const isEarned = badgeMap.has(challenge.id);
                    const prog = progressMap.get(challenge.id);
                    const currentValue = prog?.current_value || 0;
                    const percentage = Math.min((currentValue / challenge.target_value) * 100, 100);
                    const IconComponent = ICON_MAP[challenge.badge_icon] || Star;

                    return (
                      <div 
                        key={challenge.id}
                        className={cn(
                          "bg-card border rounded-xl p-4",
                          isEarned ? "border-primary/30" : "border-border"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Badge Icon */}
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                            isEarned 
                              ? "bg-primary/10" 
                              : "bg-muted/50"
                          )}>
                            <IconComponent className={cn(
                              "h-6 w-6",
                              isEarned ? "text-primary" : "text-muted-foreground"
                            )} />
                          </div>

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
                                <div className="w-full bg-muted rounded-full h-1.5">
                                  <div 
                                    className="bg-primary/60 h-1.5 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground text-right">
                                  {currentValue.toLocaleString()} / {challenge.target_value.toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Lock indicator for unearned */}
                          {!isEarned && (
                            <Lock className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
