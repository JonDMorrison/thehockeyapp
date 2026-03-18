import React from "react";
import { Check, Sparkles } from "lucide-react";
import { useTranslation } from 'react-i18next';

const tasks = [
  { label: "Stickhandling", target: "15 min", completed: true },
  { label: "Wrist shots", target: "25 reps", completed: true },
  { label: "Toe drags", target: "5 min", completed: true },
  { label: "Quick feet drill", target: "10 min", completed: false, active: true },
  { label: "Cool down stretch", target: "5 min", completed: false },
];

export const FeatureCheckoff: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="h-full w-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {t('marketing.checkoff_today_header')}
            </p>
            <h1 className="text-base font-bold text-foreground">{t('marketing.checkoff_practice_day')}</h1>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-500">60%</p>
            <p className="text-[9px] text-muted-foreground">3 of 5</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        {tasks.map((task, i) => (
          <div
            key={task.label}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              task.active
                ? "bg-emerald-500/10 border-2 border-emerald-500 scale-[1.02]"
                : task.completed
                  ? "bg-muted/30"
                  : "bg-card border border-border"
            }`}
          >
            {/* Checkbox */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                task.completed
                  ? "bg-emerald-500 text-white"
                  : task.active
                    ? "border-2 border-emerald-500 bg-emerald-500/20"
                    : "border-2 border-muted-foreground/30"
              }`}
            >
              {task.completed && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              {task.active && <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />}
            </div>

            {/* Label */}
            <div className="flex-1">
              <span className={`text-sm font-medium ${task.completed ? "text-muted-foreground line-through" : ""}`}>
                {task.label}
              </span>
              <span className="text-[10px] text-muted-foreground ml-2">{task.target}</span>
            </div>

            {task.active && (
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/20 px-2 py-1 rounded-full animate-pulse">
                TAP ✓
              </span>
            )}
          </div>
        ))}

        {/* Hint */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            {t('marketing.checkoff_tap_hint')}
          </p>
        </div>
      </div>
    </div>
  );
};
