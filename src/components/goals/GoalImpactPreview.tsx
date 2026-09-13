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
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Users,
      stat: `${Math.round(playerCount * 0.8)}+`,
      label: 'players motivated',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Zap,
      stat: '2x',
      label: 'check-in rate',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Heart,
      stat: '85%',
      label: 'enjoy team goals',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
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
