import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Zap, 
  TrendingUp, 
  Sparkles, 
  ChevronRight,
  X
} from 'lucide-react';

interface SmartGoalSuggestionsProps {
  teamStats: {
    avgShotsPerWeek?: number;
    avgSessionsPerWeek?: number;
    playerCount: number;
    lastGoalAchieved?: boolean;
  };
  onSelectSuggestion: (suggestion: GoalSuggestion) => void;
  onDismiss?: () => void;
  hideHeader?: boolean;
}

export interface GoalSuggestion {
  name: string;
  goalType: 'shots' | 'sessions' | 'participation' | 'badges';
  targetValue: number;
  timeframe: 'week' | 'month';
  description: string;
  tag: string;
  tagColor: string;
}

export function SmartGoalSuggestions({ 
  teamStats, 
  onSelectSuggestion,
  onDismiss,
  hideHeader = false,
}: SmartGoalSuggestionsProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const suggestions = generateSuggestions(teamStats);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-3"
    >
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Smart Goal Suggestions</h3>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-2">
        <AnimatePresence>
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="p-3 cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
                onClick={() => onSelectSuggestion(suggestion)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {suggestion.goalType === 'shots' && <Target className="w-5 h-5 text-primary" />}
                    {suggestion.goalType === 'sessions' && <Zap className="w-5 h-5 text-primary" />}
                    {suggestion.goalType === 'participation' && <TrendingUp className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{suggestion.name}</p>
                      <Badge 
                        variant="secondary" 
                        className={`text-[10px] px-1.5 py-0 ${suggestion.tagColor}`}
                      >
                        {suggestion.tag}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function generateSuggestions(stats: SmartGoalSuggestionsProps['teamStats']): GoalSuggestion[] {
  const { avgShotsPerWeek = 0, avgSessionsPerWeek = 0, playerCount, lastGoalAchieved } = stats;
  
  const suggestions: GoalSuggestion[] = [];

  // Shot-based suggestions
  if (avgShotsPerWeek > 0) {
    // Push goal - 20% increase
    suggestions.push({
      name: 'Push the Pace',
      goalType: 'shots',
      targetValue: Math.round(avgShotsPerWeek * 1.2),
      timeframe: 'week',
      description: `Beat last week by 20% → ${Math.round(avgShotsPerWeek * 1.2)} shots`,
      tag: 'Based on activity',
      tagColor: 'bg-blue-100 text-blue-700',
    });
  } else {
    // Default for new teams
    suggestions.push({
      name: 'First Team Challenge',
      goalType: 'shots',
      targetValue: playerCount * 50,
      timeframe: 'week',
      description: `${playerCount * 50} team shots this week`,
      tag: 'Great for starters',
      tagColor: 'bg-green-100 text-green-700',
    });
  }

  // Session-based suggestion
  suggestions.push({
    name: 'Full Team Effort',
    goalType: 'sessions',
    targetValue: playerCount * 5,
    timeframe: 'week',
    description: `${playerCount * 5} sessions completed by the team`,
    tag: lastGoalAchieved ? 'Keep momentum' : 'Popular',
    tagColor: lastGoalAchieved ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700',
  });

  // Participation goal
  suggestions.push({
    name: 'Everyone Contributes',
    goalType: 'participation',
    targetValue: 90,
    timeframe: 'week',
    description: '90% of the team checks in this week',
    tag: 'Team building',
    tagColor: 'bg-pink-100 text-pink-700',
  });

  return suggestions.slice(0, 3);
}
