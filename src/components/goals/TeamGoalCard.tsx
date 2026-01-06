import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, Calendar, Trophy, MoreVertical, RefreshCw, Archive, Pencil } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { GoalThermometer } from './GoalThermometer';
import { ContributorLeaderboard } from './ContributorLeaderboard';
import { GoalCreatorSheet } from './GoalCreatorSheet';
import { useTeamGoal, useGoalContributions, useRefreshGoalProgress, useUpdateGoal, TeamGoal } from '@/hooks/useTeamGoal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface TeamGoalCardProps {
  teamId: string;
  rosterCount?: number;
  className?: string;
}

export function TeamGoalCard({ teamId, rosterCount = 10, className }: TeamGoalCardProps) {
  const [showCreator, setShowCreator] = useState(false);
  const [editingGoal, setEditingGoal] = useState<TeamGoal | null>(null);
  const { data: goal, isLoading } = useTeamGoal(teamId);
  const { data: contributions } = useGoalContributions(goal?.id);
  const refreshProgress = useRefreshGoalProgress();
  const updateGoal = useUpdateGoal();

  const handleEdit = () => {
    if (goal) {
      setEditingGoal(goal);
      setShowCreator(true);
    }
  };

  const handleSheetClose = (open: boolean) => {
    setShowCreator(open);
    if (!open) {
      setEditingGoal(null);
    }
  };

  const handleRefresh = async () => {
    if (!goal) return;
    try {
      await refreshProgress.mutateAsync(goal.id);
      toast.success('Progress updated');
    } catch {
      toast.error('Failed to refresh progress');
    }
  };

  const handleArchive = async () => {
    if (!goal) return;
    try {
      await updateGoal.mutateAsync({ id: goal.id, status: 'archived' });
      toast.success('Goal archived');
    } catch {
      toast.error('Failed to archive goal');
    }
  };

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!goal) {
    return (
      <>
        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-lg border-dashed border-2 hover:border-primary/50',
            className
          )}
          onClick={() => setShowCreator(true)}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[120px]">
            <motion.div
              className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3"
              whileHover={{ scale: 1.1 }}
            >
              <Plus className="w-6 h-6 text-primary" />
            </motion.div>
            <h3 className="font-semibold text-foreground">Set a Team Goal</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Motivate your team with a shared target
            </p>
          </CardContent>
        </Card>
        <GoalCreatorSheet
          open={showCreator}
          onOpenChange={handleSheetClose}
          teamId={teamId}
          rosterCount={rosterCount}
          editGoal={editingGoal}
        />
      </>
    );
  }

  const daysLeft = differenceInDays(new Date(goal.end_date), new Date());
  const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);

  return (
    <>
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-4 pb-0 flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-primary flex-shrink-0" />
                <h3 className="font-semibold text-foreground truncate">{goal.name}</h3>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {goal.status === 'completed' ? (
                    <span className="text-green-600 font-medium">Completed!</span>
                  ) : daysLeft > 0 ? (
                    `${daysLeft} days left`
                  ) : daysLeft === 0 ? (
                    'Last day!'
                  ) : (
                    <span className="text-red-500">Ended</span>
                  )}
                </span>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Goal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRefresh} disabled={refreshProgress.isPending}>
                  <RefreshCw className={cn('w-4 h-4 mr-2', refreshProgress.isPending && 'animate-spin')} />
                  Refresh Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive} className="text-destructive">
                  <Archive className="w-4 h-4 mr-2" />
                  Archive Goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          <div className="p-4 flex gap-6">
            {/* Thermometer */}
            <div className="flex-shrink-0">
              <GoalThermometer
                current={goal.current_value}
                target={goal.target_value}
                goalType={goal.goal_type}
                size="md"
              />
            </div>

            {/* Stats & Leaderboard */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Progress badge */}
              {goal.status === 'completed' ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <Trophy className="w-3 h-3 mr-1" />
                  Goal Achieved!
                </Badge>
              ) : (
                <Badge variant="secondary">
                  {Math.round(progress)}% Complete
                </Badge>
              )}

              {/* Description */}
              {goal.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {goal.description}
                </p>
              )}

              {/* Leaderboard preview */}
              {contributions && contributions.length > 0 && (
                <ContributorLeaderboard
                  contributions={contributions.slice(0, 3)}
                  compact
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <GoalCreatorSheet
        open={showCreator}
        onOpenChange={handleSheetClose}
        teamId={teamId}
        rosterCount={rosterCount}
        editGoal={editingGoal}
      />
    </>
  );
}
