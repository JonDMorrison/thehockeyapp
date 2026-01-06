import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  Flame, Target, Dumbbell, Activity, Zap, Trophy, Heart,
  Play, CheckCircle2, Calendar, ChevronRight, Lock, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

const WORKOUT_CATEGORIES = [
  { id: 'shooting', label: 'Shooting', icon: Target, color: 'bg-red-500/10 text-red-500', description: 'Work on your shot' },
  { id: 'conditioning', label: 'Conditioning', icon: Dumbbell, color: 'bg-orange-500/10 text-orange-500', description: 'Build strength' },
  { id: 'mobility', label: 'Mobility', icon: Activity, color: 'bg-green-500/10 text-green-500', description: 'Stretch & recover' },
  { id: 'quick', label: 'Quick Skills', icon: Zap, color: 'bg-yellow-500/10 text-yellow-500', description: '15 min sessions' },
  { id: 'gameprep', label: 'Game Prep', icon: Trophy, color: 'bg-purple-500/10 text-purple-500', description: 'Get ready to compete' },
  { id: 'recovery', label: 'Recovery', icon: Heart, color: 'bg-pink-500/10 text-pink-500', description: 'Rest & restore' },
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

  // Fetch badges for the showcase
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
        <div className="p-4 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!dashboard?.success) {
    return (
      <AppShell>
        <div className="p-4 text-center">
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
    // For now, navigate to today - in future could clone the workout
    navigate(`/solo/today/${playerId}`);
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={player.photo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {player.first_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-bold">Hey {player.first_name}! 👋</h1>
                <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
              </div>
            </div>
            
            {/* Streak Badge */}
            {streak.current_streak > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-full">
                <Flame className="h-4 w-4" />
                <span className="font-bold text-sm">{streak.current_streak}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Hero Card - Today's Status */}
          <AppCard className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            {today.status === 'complete' ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-green-600">Workout Complete! 🎉</h2>
                <p className="text-muted-foreground mt-1">Great work today, {player.first_name}!</p>
                <p className="text-sm text-muted-foreground mt-2">Come back tomorrow to keep your streak alive</p>
              </div>
            ) : today.status === 'in_progress' ? (
              <div className="text-center">
                <h2 className="text-xl font-bold">Keep Going! 💪</h2>
                <p className="text-muted-foreground mt-1">
                  {today.completed_count} of {today.task_count} tasks done
                </p>
                <div className="w-full bg-muted rounded-full h-2 mt-3 mb-4">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(today.completed_count / today.task_count) * 100}%` }}
                  />
                </div>
                <Button onClick={handleStartWorkout} size="lg" className="w-full">
                  <Play className="mr-2 h-5 w-5" />
                  Continue Workout
                </Button>
              </div>
            ) : today.card_id ? (
              <div className="text-center">
                <h2 className="text-xl font-bold">Ready to Train? 🏒</h2>
                <p className="text-muted-foreground mt-1">
                  {today.title || 'Today\'s workout'} • {today.task_count} tasks
                </p>
                <Button onClick={handleStartWorkout} size="lg" className="w-full mt-4">
                  <Play className="mr-2 h-5 w-5" />
                  Start Workout
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-xl font-bold">Ready to Train? 🏒</h2>
                <p className="text-muted-foreground mt-1">Pick a workout to get started</p>
                <Button onClick={handleStartWorkout} size="lg" className="w-full mt-4">
                  <Play className="mr-2 h-5 w-5" />
                  Start Workout
                </Button>
              </div>
            )}
          </AppCard>

          {/* This Week */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              This Week
            </h3>
            <div className="flex gap-2">
              {week_activity.map((day, idx) => {
                const date = new Date(day.date);
                const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                  <div 
                    key={day.date}
                    className={cn(
                      "flex-1 aspect-square rounded-lg flex flex-col items-center justify-center text-xs",
                      day.completed ? "bg-green-500/20 text-green-600" : "bg-muted/50 text-muted-foreground",
                      isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                  >
                    <span className="font-medium">{format(date, 'EEE')[0]}</span>
                    {day.completed && <CheckCircle2 className="h-3 w-3 mt-0.5" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* What Do You Want To Work On */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              What Do You Want To Work On?
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {WORKOUT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/solo/today/${playerId}?category=${cat.id}`)}
                  className={cn(
                    "p-3 rounded-xl text-center transition-all hover:scale-105 active:scale-95",
                    cat.color
                  )}
                >
                  <cat.icon className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-xs font-medium block">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Workouts */}
          {recent_workouts && recent_workouts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Recent Workouts
              </h3>
              <div className="space-y-2">
                {recent_workouts.slice(0, 3).map((workout) => (
                  <AppCard key={workout.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{workout.title || 'Workout'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(workout.date), 'MMM d')} • {workout.task_count} tasks
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRepeatWorkout(workout.id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Again
                    </Button>
                  </AppCard>
                ))}
              </div>
            </div>
          )}

          {/* Badges */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Your Badges
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => navigate(`/player/${playerId}/badges`)}
              >
                View All <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              {/* Earned badges */}
              {badges?.earned.slice(0, 4).map((badge: any) => (
                <div
                  key={badge.id}
                  className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center text-2xl border border-yellow-500/30"
                >
                  {badge.challenges?.badge_icon || '🏆'}
                </div>
              ))}
              
              {/* Locked badges */}
              {badges?.all
                .filter((c: any) => !badges.earned.find((e: any) => e.challenge_id === c.id))
                .slice(0, 4 - (badges?.earned.length || 0))
                .map((challenge: any) => (
                  <div
                    key={challenge.id}
                    className="flex-shrink-0 w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center text-2xl opacity-40 relative"
                  >
                    {challenge.badge_icon}
                    <Lock className="h-3 w-3 absolute bottom-1 right-1 text-muted-foreground" />
                  </div>
                ))}
                
              {(!badges || (badges.earned.length === 0 && badges.all.length === 0)) && (
                <div className="text-sm text-muted-foreground py-4">
                  Complete workouts to earn badges!
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <AppCard className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.total_workouts}</p>
              <p className="text-xs text-muted-foreground">Workouts</p>
            </AppCard>
            <AppCard className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.total_shots}</p>
              <p className="text-xs text-muted-foreground">Shots</p>
            </AppCard>
            <AppCard className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.badges_earned}</p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </AppCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
