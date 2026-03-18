import React from "react";
import { Check, Clock, Target, Dumbbell, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';

const tasks = [
  { label: "Stickhandling", target: "15 min", icon: Target, completed: false },
  { label: "Wrist shots", target: "25 reps", icon: Target, completed: false },
  { label: "Toe drags", target: "5 min", icon: Target, completed: false },
  { label: "Quick feet drill", target: "10 min", icon: Dumbbell, completed: false },
  { label: "Cool down stretch", target: "5 min", icon: Heart, completed: false },
];

export const FeatureTaskCard: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="h-full w-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {t('marketing.task_card_today_header')}
        </p>
        <h1 className="text-base font-bold text-foreground">{t('marketing.task_card_practice_day')}</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Info card */}
        <div className="bg-primary/5 rounded-xl p-3 border border-primary/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">{t('marketing.task_card_time_total')}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {t('marketing.rewards_task_badge_info')}
          </p>
        </div>

        {/* Tasks */}
        <div className="space-y-2">
          {tasks.map((task, i) => (
            <div
              key={task.label}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <task.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{task.label}</p>
                <p className="text-[10px] text-muted-foreground">{task.target}</p>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
