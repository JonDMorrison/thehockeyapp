import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays } from "date-fns";
import { 
  Flame, Play, CheckCircle2, ChevronRight, Lock, RotateCcw,
  Target, Dumbbell, Zap, Calendar, Star, Award, Trophy, Medal,
  Shield, Crown, CheckCircle, Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Map database icon names to Lucide components
const BADGE_ICONS: Record<string, React.ElementType> = {
  'target': Target,
  'flame': Flame,
  'trophy': Trophy,
  'medal': Medal,
  'star': Star,
  'award': Award,
  'shield': Shield,
  'crown': Crown,
  'zap': Zap,
  'brain': Brain,
  'check-circle': CheckCircle,
  'calendar': Calendar,
};

// Badge categories for grouping
const BADGE_CATEGORIES = [
  { 
    id: 'consistency', 
    label: 'Consistency', 
    metricTypes: ['sessions_completed'],
    description: 'Keep showing up'
  },
  { 
    id: 'shooting', 
    label: 'Shooting', 
    metricTypes: ['total_shots'],
    description: 'Put in the reps'
  },
  { 
    id: 'gameday', 
    label: 'Game Ready', 
    metricTypes: ['game_day_completed', 'prep_tasks_completed'],
    description: 'Be prepared'
  },
];

interface DashboardData {
  success: boolean;
  error?: string;
  player: {
    id: string;
    first_name: string;
    last_initial: string | null;
    photo_url: string | null;
  };
  plan: {
    id: string;
    name: string;
    tier: string;
    focus: string[];
    days_per_week: number;
  } | null;
  today: {
    date: string;
    status: 'no_workout' | 'not_started' | 'in_progress' | 'complete';
    card_id: string | null;
    title: string | null;
    task_count: number;
    completed_count: number;
  };
  streak: {
    current_streak: number;
    best_streak: number;
  };
  recent_workouts: Array<{
    id: string;
    title: string;
    date: string;
    tier: string;
    task_count: number;
  }>;
  week_activity: Array<{
    date: string;
    completed: boolean;
  }>;
  stats: {
    total_workouts: number;
    total_shots: number;
    badges_earned: number;
    badges_total: number;
  };
}

const FOCUS_AREAS = [
  { id: 'shooting', label: 'Shooting', icon: Target },
  { id: 'conditioning', label: 'Strength', icon: Dumbbell },
  { id: 'skills', label: 'Skills', icon: Zap },
];

export default function SoloDashboard() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['solo-dashboard', playerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_solo_dashboard', {
        p_player_id: playerId
      });
      if (error) throw error;
      return data as unknown as DashboardData;
    },
    enabled: !!playerId,
  });

  const { data: badges } = useQuery({
    queryKey: ['player-badges-showcase', playerId],
    queryFn: async () => {
      const [earnedResult, allChallengesResult] = await Promise.all([
        supabase
          .from('player_badges')
          .select('*, challenges(*)')
          .eq('player_id', playerId!),
        supabase
          .from('challenges')
          .select('*')
          .eq('is_active', true)
      ]);
      
      return {
        earned: earnedResult.data || [],
        all: allChallengesResult.data || []
      };
    },
    enabled: !!playerId,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!dashboard?.success) {
    return (
      <AppShell>
        <div className="p-4 text-center pt-20">
          <p className="text-muted-foreground">Unable to load dashboard</p>
          <Button className="mt-4" onClick={() => navigate('/solo/setup')}>
            Go to Setup
          </Button>
        </div>
      </AppShell>
    );
  }

  const { player, today, streak, recent_workouts, week_activity, stats } = dashboard;

  const handleStartWorkout = () => {
    navigate(`/solo/today/${playerId}`);
  };

  const handleRepeatWorkout = (cardId: string) => {
    navigate(`/solo/today/${playerId}`);
  };

  // Generate week days for display
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const activity = week_activity?.find(w => w.date === dateStr);
    return {
      date,
      dayLetter: format(date, 'EEEEE'),
      isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
      completed: activity?.completed || false
    };
  });

  const progressPercent = today.task_count > 0 
    ? Math.round((today.completed_count / today.task_count) * 100) 
    : 0;

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 border-2 border-border">
                <AvatarImage src={player.photo_url || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-lg font-semibold">
                  {player.first_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Hey {player.first_name}!
                </h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), 'EEEE, MMM d')}
                </p>
              </div>
            </div>
            
            {/* Streak */}
            {streak.current_streak > 0 && (
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-2 rounded-full">
                <Flame className="h-4 w-4" />
                <span className="font-bold text-sm">{streak.current_streak}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 space-y-6 pb-8">
          {/* Hero Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            {today.status === 'complete' ? (
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Done for today!</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Great work. Come back tomorrow.
                </p>
              </div>
            ) : today.status === 'in_progress' ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <h2 className="text-lg font-bold text-foreground">
                      {today.title || "Today's Workout"}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{progressPercent}%</p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-5">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <Button onClick={handleStartWorkout} size="lg" className="w-full">
                  <Play className="mr-2 h-4 w-4" />
                  Continue
                </Button>
              </div>
            ) : (
              <div className="text-center py-2">
                <h2 className="text-xl font-bold text-foreground mb-1">
                  Ready to train?
                </h2>
                <p className="text-muted-foreground text-sm mb-5">
                  {today.card_id 
                    ? `${today.task_count} tasks waiting for you`
                    : "Start your workout for today"
                  }
                </p>
                <Button onClick={handleStartWorkout} size="lg" className="w-full">
                  <Play className="mr-2 h-4 w-4" />
                  Start Workout
                </Button>
              </div>
            )}
          </div>

          {/* Week Progress */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">This Week</h3>
            </div>
            <div className="flex gap-2">
              {weekDays.map((day, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex-1 aspect-square rounded-xl flex flex-col items-center justify-center transition-all",
                    day.completed 
                      ? "bg-primary/10" 
                      : "bg-muted/50",
                    day.isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium",
                    day.completed ? "text-primary" : "text-muted-foreground"
                  )}>
                    {day.dayLetter}
                  </span>
                  {day.completed && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Plan Training CTA */}
          <div>
            <button
              onClick={() => navigate(`/solo/planning/${playerId}`)}
              className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors active:scale-[0.99]"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Plan Your Training</p>
                <p className="text-sm text-muted-foreground">Build workouts, weekly routines, or AI programs</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Recent Workouts */}
          {recent_workouts && recent_workouts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Completed Workouts
              </h3>
              <div className="space-y-2">
                {recent_workouts.slice(0, 3).map((workout) => (
                  <div 
                    key={workout.id} 
                    className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {workout.title || 'Workout'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(workout.date), 'MMM d')} · {workout.task_count} tasks
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => handleRepeatWorkout(workout.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aspirational Badges by Category */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Badges to Earn
              </h3>
              <button 
                className="text-xs text-primary font-medium flex items-center gap-0.5"
                onClick={() => navigate(`/solo/badges/${playerId}`)}
              >
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            
            <div className="space-y-3">
              {BADGE_CATEGORIES.map((category) => {
                // Get badges for this category
                const categoryBadges = badges?.all.filter((c: any) => 
                  category.metricTypes.includes(c.metric_type)
                ) || [];
                
                // Get earned badges in this category
                const earnedInCategory = categoryBadges.filter((c: any) =>
                  badges?.earned.find((e: any) => e.challenge_id === c.id)
                );
                
                // Get next badge to earn (lowest target not yet earned)
                const unearnedBadges = categoryBadges
                  .filter((c: any) => !badges?.earned.find((e: any) => e.challenge_id === c.id))
                  .sort((a: any, b: any) => a.target_value - b.target_value);
                
                const nextBadge = unearnedBadges[0];
                const IconComponent = nextBadge ? BADGE_ICONS[nextBadge.badge_icon] || Star : Star;
                
                return (
                  <div 
                    key={category.id}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      {/* Badge Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        earnedInCategory.length > 0 
                          ? "bg-primary/10" 
                          : "bg-muted/50"
                      )}>
                        {nextBadge ? (
                          <IconComponent className={cn(
                            "h-6 w-6",
                            earnedInCategory.length > 0 
                              ? "text-primary" 
                              : "text-muted-foreground"
                          )} />
                        ) : (
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      
                      {/* Badge Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground">
                            {category.label}
                          </p>
                          {earnedInCategory.length > 0 && (
                            <span className="text-xs text-primary font-medium">
                              {earnedInCategory.length}/{categoryBadges.length}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {nextBadge 
                            ? `Next: ${nextBadge.name}` 
                            : "All badges earned!"
                          }
                        </p>
                      </div>
                      
                      {/* Lock or Check */}
                      {nextBadge ? (
                        <Lock className="h-4 w-4 text-muted-foreground/50" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.total_workouts}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Workouts</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.total_shots}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Shots</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.badges_earned}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Badges</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
