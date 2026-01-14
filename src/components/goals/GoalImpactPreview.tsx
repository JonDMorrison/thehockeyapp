import { motion } from 'framer-motion';
import { TrendingUp, Users, Zap, Heart } from 'lucide-react';

interface GoalImpactPreviewProps {
  playerCount: number;
  goalType?: string;
}

export function GoalImpactPreview({ playerCount, goalType }: GoalImpactPreviewProps) {
  const impacts = [
    {
      icon: TrendingUp,
      stat: '+40%',
      label: 'engagement boost',
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      icon: Users,
      stat: `${Math.round(playerCount * 0.8)}+`,
      label: 'players motivated',
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      icon: Zap,
      stat: '2x',
      label: 'check-in rate',
      color: 'text-amber-500',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      icon: Heart,
      stat: '85%',
      label: 'enjoy team goals',
      color: 'text-pink-500',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    },
  ];

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
      <p className="text-sm font-medium text-foreground mb-3">
        ✨ When you set a goal, teams typically see:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {impacts.map((impact, index) => (
          <motion.div
            key={impact.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`p-3 rounded-lg ${impact.bgColor} flex items-center gap-2`}
          >
            <impact.icon className={`w-4 h-4 ${impact.color}`} />
            <div>
              <p className={`text-sm font-bold ${impact.color}`}>{impact.stat}</p>
              <p className="text-[10px] text-muted-foreground">{impact.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
