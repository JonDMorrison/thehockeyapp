import React from "react";
import { Sparkles, Plus, Target, Dumbbell, Heart, Clock, GripVertical } from "lucide-react";
import { useTranslation } from 'react-i18next';

export const FeatureBuilder: React.FC = () => {
  const { t } = useTranslation();

  const taskTypes = [
    { icon: Target, label: t('marketing.builder_shooting'), color: "bg-blue-500" },
    { icon: Dumbbell, label: t('marketing.builder_conditioning'), color: "bg-orange-500" },
    { icon: Heart, label: t('marketing.builder_mobility'), color: "bg-pink-500" },
  ];

  const draftTasks = [
    { label: t('marketing.ai_preview_stickhandling_warmup'), time: "5 min", type: "prep" },
    { label: t('marketing.ai_preview_wrist_shots'), time: "25 reps", type: "shooting" },
  ];

  return (
    <div className="h-full w-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-foreground">{t('marketing.builder_build_practice')}</h1>
          <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-600 px-2 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />
            <span className="text-[10px] font-semibold">{t('marketing.builder_ai_assist')}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Date & tier */}
        <div className="flex gap-2">
          <div className="flex-1 bg-muted/50 rounded-lg p-2.5">
            <p className="text-[9px] text-muted-foreground uppercase">{t('marketing.builder_date')}</p>
            <p className="text-xs font-medium">Today</p>
          </div>
          <div className="flex-1 bg-purple-500/10 rounded-lg p-2.5 border border-purple-500/30">
            <p className="text-[9px] text-purple-600 uppercase">{t('marketing.builder_tier')}</p>
            <p className="text-xs font-medium text-purple-600">REP</p>
          </div>
        </div>

        {/* Quick add */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('marketing.builder_quick_add')}
          </p>
          <div className="flex gap-2">
            {taskTypes.map((type) => (
              <button
                key={type.label}
                className="flex-1 flex flex-col items-center gap-1 p-2 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className={`w-6 h-6 rounded-md ${type.color} flex items-center justify-center`}>
                  <type.icon className="w-3 h-3 text-white" />
                </div>
                <span className="text-[9px] font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Draft tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t('marketing.builder_tasks')}
            </p>
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>~20 min</span>
            </div>
          </div>

          <div className="space-y-2">
            {draftTasks.map((task) => (
              <div
                key={task.label}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                <div className="flex-1">
                  <p className="text-xs font-medium">{task.label}</p>
                  <p className="text-[9px] text-muted-foreground">{task.time}</p>
                </div>
              </div>
            ))}

            {/* Add button */}
            <button className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-xs font-medium">{t('marketing.builder_add_task')}</span>
            </button>
          </div>
        </div>

        {/* AI button */}
        <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-3 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">{t('marketing.builder_generate_with_ai')}</span>
        </button>
      </div>
    </div>
  );
};
