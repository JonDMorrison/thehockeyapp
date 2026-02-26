import { useState } from "react";
import type { Challenge } from "@/core";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays } from "date-fns";
import { motion } from "framer-motion";
import { 
  Flame, Play, CheckCircle2, ChevronRight, Lock, RotateCcw,
  Target, Dumbbell, Zap, Calendar, Star, Award, Trophy, Medal,
  Shield, Crown, CheckCircle, Brain, Users, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { SkeletonDashboardHeader, SkeletonQuickStats, SkeletonHeroCard } from "@/components/app/Skeleton";
import { cn } from "@/lib/utils";
import { InviteFriendModal } from "@/components/player/InviteFriendModal";
import { SoloUpcomingEvents } from "@/components/player/SoloUpcomingEvents";
import { SoloJoinTeamSection } from "@/components/player/SoloJoinTeamSection";
import { UserMenu } from "@/components/app/UserMenu";
import { ContextSwitcher } from "@/components/app/ContextSwitcher";
import logoImage from "@/assets/hockey-app-logo.png";
import { BETA_MODE } from "@/core/constants";

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
    has_workout: boolean;
    completed: boolean;
  }>;
  stats: {
    total_workouts: number;
    total_shots: number;
    badges_earned: number;
    badges_total: number;
  };
}

export default function SoloDashboard() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showScheduleConnect, setShowScheduleConnect] = useState(false);

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
          <SkeletonDashboardHeader />
          <SkeletonQuickStats />
          <SkeletonHeroCard />
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

  const { player, today, streak, recent_workouts, week_activity, stats, plan } = dashboard;

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
      hasWorkout: activity?.has_workout || false,
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
              <div className="flex items-center gap-2">
                <img src={logoImage} alt="The Hockey App" className="w-10 h-10 object-contain" />
                <span className="font-semibold text-foreground hidden sm:inline">The Hockey App</span>
              </div>
              <UserMenu
                avatarUrl={player.photo_url}
                initials={player.first_name[0]}
                displayName={player.first_name}
                size="lg"
                playerId={playerId}
                settingsPath={`/solo/settings/${playerId}`}
                onPhotoUploaded={() => {
                  // Refetch dashboard data to update avatar without full reload
                  queryClient.invalidateQueries({ queryKey: ['solo-dashboard', playerId] });
                }}
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Hey {player.first_name}!
                </h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), 'EEEE, MMM d')}
                </p>
              </div>
            </div>
            
            {/* Context Switcher & Streak */}
            <div className="flex items-center gap-2">
              <ContextSwitcher currentPlayerId={playerId} compact />
              {streak.current_streak > 0 && (
                <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-2 rounded-full">
                  <Flame className="h-4 w-4" />
                  <span className="font-bold text-sm">{streak.current_streak}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 space-y-6 pb-8">
          {/* Three Card Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Card 1: Ready to Train */}
            <motion.button
              onClick={handleStartWorkout}
              className="relative overflow-hidden rounded-2xl p-4 aspect-square flex flex-col justify-between bg-gradient-to-br from-blue-500 to-indigo-600 text-left"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/10 -translate-y-4 translate-x-4" />
              <div className="absolute bottom-0 left-0 w-12 h-12 rounded-full bg-white/5 translate-y-4 -translate-x-4" />
              
              {/* Icon */}
              <div className="relative z-10 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                {today.status === 'complete' ? (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                ) : today.status === 'in_progress' ? (
                  <div className="relative">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24">
                      <circle 
                        cx="12" cy="12" r="10" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        opacity="0.3"
                      />
                      <circle 
                        cx="12" cy="12" r="10" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                        strokeDasharray={`${progressPercent * 0.628} 100`}
                        strokeLinecap="round"
                        transform="rotate(-90 12 12)"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                      {progressPercent}%
                    </span>
                  </div>
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                <h3 className="font-bold text-white text-sm leading-tight">
                  {today.status === 'complete' 
                    ? "Done!" 
                    : today.status === 'in_progress' 
                      ? "Continue" 
                      : "Ready to Train"
                  }
                </h3>
                <p className="text-white/70 text-xs mt-0.5">
                  {today.status === 'complete' 
                    ? "Great work" 
                    : today.status === 'in_progress'
                      ? `${today.completed_count}/${today.task_count} done`
                      : today.card_id 
                        ? `${today.task_count} tasks`
                        : "Start now"
                  }
                </p>
              </div>
            </motion.button>

            {/* Card 2: Plan Training */}
            <motion.button
              onClick={() => navigate(`/solo/planning/${playerId}`)}
              className="relative overflow-hidden rounded-2xl p-4 aspect-square flex flex-col justify-between bg-gradient-to-br from-emerald-500 to-teal-600 text-left"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/10 -translate-y-4 translate-x-4" />
              <div className="absolute bottom-0 left-0 w-12 h-12 rounded-full bg-white/5 translate-y-4 -translate-x-4" />
              
              {/* Icon */}
              <div className="relative z-10 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                <h3 className="font-bold text-white text-sm leading-tight">Plan Training</h3>
                <p className="text-white/70 text-xs mt-0.5">Build routines</p>
              </div>
            </motion.button>

            {/* Card 3: Invite A Friend */}
            <motion.button
              onClick={() => setShowInviteModal(true)}
              className="relative overflow-hidden rounded-2xl p-4 aspect-square flex flex-col justify-between bg-gradient-to-br from-orange-500 to-amber-500 text-left"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/10 -translate-y-4 translate-x-4" />
              <div className="absolute bottom-0 left-0 w-12 h-12 rounded-full bg-white/5 translate-y-4 -translate-x-4" />
              
              {/* Icon */}
              <div className="relative z-10 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                <h3 className="font-bold text-white text-sm leading-tight">Invite Friend</h3>
                <p className="text-white/70 text-xs mt-0.5">{BETA_MODE ? "Train together" : "Give 7 days free"}</p>
              </div>
            </motion.button>
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
                      : day.hasWorkout
                        ? "bg-amber-500/10"
                        : "bg-muted/50",
                    day.isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium",
                    day.completed 
                      ? "text-primary" 
                      : day.hasWorkout
                        ? "text-amber-600"
                        : "text-muted-foreground"
                  )}>
                    {day.dayLetter}
                  </span>
                  {day.completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5" />
                  ) : day.hasWorkout ? (
                    <Dumbbell className="h-3 w-3 text-amber-600 mt-0.5" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Join a Team Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Teams</h3>
            </div>
            <SoloJoinTeamSection playerId={playerId!} variant="card" />
          </div>

          {/* Schedule Widget */}
          <SoloUpcomingEvents 
            playerId={playerId!}
            onConnectSchedule={() => navigate(`/solo/settings/${playerId}`)}
          />
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
                const categoryBadges = badges?.all.filter((c: Challenge) => 
                  category.metricTypes.includes(c.metric_type)
                ) || [];
                
                // Get earned badges in this category
                const earnedInCategory = categoryBadges.filter((c: Challenge) =>
                  badges?.earned.find((e: { challenge_id: string }) => e.challenge_id === c.id)
                );
                
                // Get next badge to earn (lowest target not yet earned)
                const unearnedBadges = categoryBadges
                  .filter((c: Challenge) => !badges?.earned.find((e: { challenge_id: string }) => e.challenge_id === c.id))
                  .sort((a: Challenge, b: Challenge) => a.target_value - b.target_value);
                
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

      {/* Invite Friend Modal */}
      <InviteFriendModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        playerId={playerId!}
        todayCardId={today.card_id}
        activePlanId={plan?.id}
        playerName={player.first_name}
      />
    </AppShell>
  );
}