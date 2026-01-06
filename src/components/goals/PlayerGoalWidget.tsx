import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Clock, Trophy, Flame, Gift, Medal, Pizza, Gamepad2, Star } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { GoalThermometer } from './GoalThermometer';
import { ContributorLeaderboard } from './ContributorLeaderboard';
import { useTeamGoal, useGoalContributions } from '@/hooks/useTeamGoal';
import { fireGoalConfetti } from '@/lib/confetti';

interface PlayerGoalWidgetProps {
  teamId: string;
  className?: string;
}

const motivationalMessages = [
  { min: 0, max: 25, message: "Let's get started! 🚀", icon: Target },
  { min: 25, max: 50, message: "Great momentum! 💪", icon: Flame },
  { min: 50, max: 75, message: "Over halfway there! 🔥", icon: Flame },
  { min: 75, max: 99, message: "Almost there - push hard! ⚡", icon: Flame },
  { min: 100, max: Infinity, message: "Goal achieved! 🏆", icon: Trophy },
];

// Reward display config matching GoalRewardPrompt options
const rewardConfig: Record<string, { emoji: string; label: string; icon: React.ComponentType<any>; color: string }> = {
  badges: { emoji: "🏅", label: "Badge Hunt", icon: Medal, color: "from-amber-500 to-yellow-500" },
  scrimmage: { emoji: "🏒", label: "Scrimmage Game", icon: Gamepad2, color: "from-blue-500 to-cyan-500" },
  pizza: { emoji: "🍕", label: "Pizza Party", icon: Pizza, color: "from-red-500 to-orange-500" },
  trophy: { emoji: "🏆", label: "Team Trophy", icon: Trophy, color: "from-yellow-500 to-amber-600" },
  stars: { emoji: "⭐", label: "Star Stickers", icon: Star, color: "from-purple-500 to-pink-500" },
  surprise: { emoji: "🎁", label: "Mystery Prize", icon: Gift, color: "from-emerald-500 to-teal-500" },
  custom: { emoji: "🎯", label: "Custom Reward", icon: Gift, color: "from-indigo-500 to-purple-500" },
};

export function PlayerGoalWidget({ teamId, className }: PlayerGoalWidgetProps) {
  const { data: goal, isLoading } = useTeamGoal(teamId);
  const { data: contributions } = useGoalContributions(goal?.id);
  const [showCelebration, setShowCelebration] = useState(false);

  // Trigger celebration on first load if goal is completed
  useEffect(() => {
    if (goal?.status === 'completed' && !showCelebration) {
      const celebrationKey = `goal_celebrated_${goal.id}`;
      if (!sessionStorage.getItem(celebrationKey)) {
        sessionStorage.setItem(celebrationKey, 'true');
        setShowCelebration(true);
        fireGoalConfetti();
      }
    }
  }, [goal?.status, goal?.id, showCelebration]);

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-4">
          <div className="h-20 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!goal || goal.status === 'archived') {
    return null;
  }

  const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
  const daysLeft = differenceInDays(new Date(goal.end_date), new Date());
  const message = motivationalMessages.find(m => progress >= m.min && progress < m.max) || motivationalMessages[0];
  const MessageIcon = message.icon;

  // Get reward display info
  const reward = goal.reward_type ? rewardConfig[goal.reward_type] || rewardConfig.custom : null;
  const rewardLabel = goal.reward_description || reward?.label || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        {/* Gradient header */}
        <div className={cn(
          'h-1.5',
          goal.status === 'completed' 
            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
            : progress >= 75
              ? 'bg-gradient-to-r from-orange-400 to-red-500'
              : progress >= 50
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                : 'bg-gradient-to-r from-blue-400 to-cyan-500'
        )} />

        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Thermometer */}
            <div className="flex-shrink-0">
              <GoalThermometer
                current={goal.current_value}
                target={goal.target_value}
                goalType={goal.goal_type}
                size="sm"
                showMilestones={false}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary flex-shrink-0" />
                  <h3 className="font-semibold text-foreground truncate text-sm">
                    {goal.name}
                  </h3>
                </div>
                
                {/* Time remaining */}
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {goal.status === 'completed' ? (
                    <span className="text-green-600 font-medium">Completed!</span>
                  ) : daysLeft > 0 ? (
                    <span>{daysLeft} days remaining</span>
                  ) : daysLeft === 0 ? (
                    <span className="text-orange-500 font-medium">Last day!</span>
                  ) : (
                    <span className="text-muted-foreground">Ended</span>
                  )}
                </div>
              </div>

              {/* Reward display - what they're working towards */}
              {reward && rewardLabel && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                    'bg-gradient-to-r',
                    reward.color,
                    'bg-opacity-10'
                  )}
                  style={{
                    background: `linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.1))`
                  }}
                >
                  <span className="text-lg">{reward.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground block">Working towards</span>
                    <span className="font-medium text-foreground truncate block">{rewardLabel}</span>
                  </div>
                </motion.div>
              )}

              {/* Motivational message */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={goal.status === 'completed' ? 'completed' : 'progress'}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                    goal.status === 'completed'
                      ? 'bg-green-500/10 text-green-700'
                      : progress >= 75
                        ? 'bg-orange-500/10 text-orange-700'
                        : 'bg-primary/10 text-primary'
                  )}
                >
                  <MessageIcon className={cn('w-4 h-4', goal.status === 'completed' && 'animate-bounce')} />
                  {message.message}
                </motion.div>
              </AnimatePresence>

              {/* Leaderboard if enabled */}
              {goal.show_leaderboard && contributions && contributions.length > 0 && (
                <ContributorLeaderboard
                  contributions={contributions.slice(0, 3)}
                  compact
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}