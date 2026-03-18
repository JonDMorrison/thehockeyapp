import React from "react";
import { Check, Flame, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';

interface DemoTask {
  id: string;
  label: string;
  target?: string;
  completed: boolean;
}

const demoTasks: DemoTask[] = [
  { id: "1", label: "Stickhandling", target: "15 min", completed: true },
  { id: "2", label: "Wrist shots", target: "25 reps", completed: true },
  { id: "3", label: "Toe drags", target: "5 min", completed: true },
  { id: "4", label: "Quick feet drill", target: "10 min", completed: false },
  { id: "5", label: "Cool down stretch", target: "5 min", completed: false },
];

const completedCount = demoTasks.filter((t) => t.completed).length;
const progressPercent = (completedCount / demoTasks.length) * 100;

export const MarketingAppPreview: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="h-full w-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase">
              {t('marketing.app_preview_today_header')}
            </p>
            <h1 className="text-base font-bold text-foreground mt-0.5">
              {t('marketing.app_preview_northside_wolves')}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-full">
            <Calendar className="w-3 h-3" />
            <span className="text-[10px] font-semibold">{t('marketing.app_preview_practice_day')}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Progress Card */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-4 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Flame className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{t('marketing.app_preview_today_progress')}</p>
                <p className="text-[10px] text-muted-foreground">
                  {completedCount} of {demoTasks.length} complete
                </p>
              </div>
            </div>
            <span className="text-lg font-bold text-primary">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Tasks Section */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('marketing.app_preview_today_practice')}
          </h2>
          <div className="space-y-2">
            {demoTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all",
                  task.completed ? "bg-muted/30" : "bg-card border border-border"
                )}
              >
                {/* Checkbox */}
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    task.completed
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-muted-foreground/40"
                  )}
                >
                  {task.completed && <Check className="w-3 h-3" strokeWidth={3} />}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      task.completed && "text-muted-foreground line-through"
                    )}
                  >
                    {task.label}
                  </span>
                  {task.target && (
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {task.target}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Stats Row */}
        <div className="flex items-center justify-around bg-muted/30 rounded-xl p-3 mt-2">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">7</p>
            <p className="text-[9px] text-muted-foreground uppercase">{t('marketing.app_preview_day_streak')}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">142</p>
            <p className="text-[9px] text-muted-foreground uppercase">{t('marketing.app_preview_total_shots')}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-primary">🔥</p>
            <p className="text-[9px] text-muted-foreground uppercase">{t('marketing.app_preview_on_fire')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
