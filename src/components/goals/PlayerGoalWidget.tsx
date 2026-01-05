import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Clock, Trophy, Flame } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { GoalThermometer } from './GoalThermometer';
import { ContributorLeaderboard } from './ContributorLeaderboard';
import { useTeamGoal, useGoalContributions } from '@/hooks/useTeamGoal';

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

export function PlayerGoalWidget({ teamId, className }: PlayerGoalWidgetProps) {
  const { data: goal, isLoading } = useTeamGoal(teamId);
  const { data: contributions } = useGoalContributions(goal?.id);

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
            <div className="flex-1 min-w-0 space-y-3">
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

              {/* Motivational message */}
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                goal.status === 'completed'
                  ? 'bg-green-500/10 text-green-700'
                  : progress >= 75
                    ? 'bg-orange-500/10 text-orange-700'
                    : 'bg-primary/10 text-primary'
              )}>
                <MessageIcon className="w-4 h-4" />
                {message.message}
              </div>

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
