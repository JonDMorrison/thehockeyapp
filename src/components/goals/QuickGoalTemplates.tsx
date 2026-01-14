import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  Flame, 
  Trophy, 
  Target,
  Zap
} from 'lucide-react';

interface QuickGoalTemplatesProps {
  playerCount: number;
  lastWeekShots?: number;
  onSelect: (template: QuickTemplate) => void;
}

export interface QuickTemplate {
  name: string;
  goalType: 'shots' | 'sessions' | 'participation';
  targetValue: number;
  timeframe: 'week' | 'month';
  description: string;
}

export function QuickGoalTemplates({ playerCount, lastWeekShots = 0, onSelect }: QuickGoalTemplatesProps) {
  const templates: (QuickTemplate & { icon: typeof Rocket; color: string })[] = [
    {
      name: 'Double Down',
      goalType: 'shots',
      targetValue: lastWeekShots > 0 ? lastWeekShots * 2 : playerCount * 100,
      timeframe: 'week',
      description: lastWeekShots > 0 ? 'Double last week\'s shots' : 'Set an ambitious shot target',
      icon: Rocket,
      color: 'bg-gradient-to-r from-orange-500 to-red-500',
    },
    {
      name: 'Perfect Week',
      goalType: 'sessions',
      targetValue: playerCount * 7,
      timeframe: 'week',
      description: 'Every player, every day',
      icon: Flame,
      color: 'bg-gradient-to-r from-amber-500 to-orange-500',
    },
    {
      name: 'Team Unity',
      goalType: 'participation',
      targetValue: 100,
      timeframe: 'week',
      description: '100% team participation',
      icon: Trophy,
      color: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <p className="text-sm font-medium">Quick Goals</p>
        <Badge variant="secondary" className="text-[10px]">One Tap</Badge>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {templates.map((template, index) => (
          <motion.div
            key={template.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              variant="outline"
              className="flex-shrink-0 h-auto py-3 px-4 flex flex-col items-start gap-1 min-w-[140px] hover:border-primary/50"
              onClick={() => onSelect(template)}
            >
              <div className={`w-8 h-8 rounded-lg ${template.color} flex items-center justify-center mb-1`}>
                <template.icon className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm">{template.name}</span>
              <span className="text-[10px] text-muted-foreground text-left">
                {template.description}
              </span>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
