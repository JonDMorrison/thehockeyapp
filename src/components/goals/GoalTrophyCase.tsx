import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Target, 
  Zap, 
  Users, 
  Award,
  ChevronRight,
  Flame,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface GoalTrophyCaseProps {
  teamId: string;
  onViewAll?: () => void;
  compact?: boolean;
}

interface CompletedGoal {
  id: string;
  name: string;
  goal_type: string;
  target_value: number;
  completed_at: string;
  timeframe: string;
}

const goalTypeIcons = {
  shots: Target,
  sessions: Zap,
  participation: Users,
  badges: Award,
};

const goalTypeColors = {
  shots: 'bg-success/10 text-success border-success/20',
  sessions: 'bg-success/10 text-success border-success/20',
  participation: 'bg-success/10 text-success border-success/20',
  badges: 'bg-success/10 text-success border-success/20',
};

export function GoalTrophyCase({ teamId, onViewAll, compact = false }: GoalTrophyCaseProps) {
  const { data: completedGoals = [], isLoading } = useQuery({
    queryKey: ['completed-goals', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_goals')
        .select('id, name, goal_type, target_value, completed_at, timeframe')
        .eq('team_id', teamId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(compact ? 3 : 10);

      if (error) throw error;
      return data as CompletedGoal[];
    },
  });

  const goalStreak = completedGoals.length;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-24 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (completedGoals.length === 0) {
    return null; // Don't show if no completed goals
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Trophy Case
            {goalStreak >= 3 && (
              <Badge variant="secondary" className="gap-1 border-success/20 bg-success/10 text-success">
                <Flame className="w-3 h-3" />
                {goalStreak} Goals Crushed
              </Badge>
            )}
          </CardTitle>
          {onViewAll && completedGoals.length > 3 && (
            <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs">
              View All
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {completedGoals.slice(0, compact ? 3 : 10).map((goal, index) => {
            const Icon = goalTypeIcons[goal.goal_type as keyof typeof goalTypeIcons] || Target;
            const colorClass = goalTypeColors[goal.goal_type as keyof typeof goalTypeColors] || 'bg-muted';

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center border',
                  colorClass
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{goal.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {goal.target_value.toLocaleString()} {goal.goal_type} • {format(new Date(goal.completed_at!), 'MMM d, yyyy')}
                  </p>
                </div>
                <Star className="w-4 h-4 text-success flex-shrink-0" />
              </motion.div>
            );
          })}
        </div>

        {/* Achievement summary */}
        {goalStreak >= 5 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-lg border border-success/20 bg-success/5 p-3"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Goal Champion Team! 🏆
                </p>
                <p className="text-xs text-muted-foreground">
                  {goalStreak} goals achieved together
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
