import React from "react";
import { Check, Trophy, Star, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoTask {
  id: string;
  label: string;
  target?: string;
  completed: boolean;
  justCompleted?: boolean;
}

const demoTasks: DemoTask[] = [
  { id: "1", label: "Stickhandling", target: "15 min", completed: true },
  { id: "2", label: "Wrist shots", target: "25 reps", completed: true },
  { id: "3", label: "Toe drags", target: "5 min", completed: true },
  { id: "4", label: "Quick feet drill", target: "10 min", completed: true, justCompleted: true },
  { id: "5", label: "Cool down stretch", target: "5 min", completed: true },
];

export const MarketingMilestonePreview: React.FC = () => {
  return (
    <div className="h-full w-full bg-background text-foreground overflow-hidden relative">
      {/* Safe area padding for phone notch */}
      <div className="h-6 bg-background" />
      
      {/* Celebration overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Scrollable content */}
      <div className="h-[calc(100%-1.5rem)] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase">
              Today — Mon, Jan 6
            </p>
            <h1 className="text-base font-bold text-foreground mt-0.5">
              Northside Wolves
            </h1>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full">
            <Trophy className="w-3 h-3" />
            <span className="text-[10px] font-semibold">Milestone!</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Milestone Achievement Card */}
        <div className="relative bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 rounded-xl p-4 text-white shadow-lg overflow-hidden">
          {/* Sparkle effects */}
          <div className="absolute top-2 right-3 text-white/80">
            <Star className="w-4 h-4 fill-current animate-pulse" />
          </div>
          <div className="absolute bottom-3 left-4 text-white/60">
            <Star className="w-3 h-3 fill-current animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-white/80">🎉 Achievement Unlocked!</p>
              <p className="text-lg font-bold">Perfect Week</p>
              <p className="text-xs text-white/80">Completed all tasks 5 days in a row</p>
            </div>
          </div>
        </div>

        {/* Completed Progress */}
        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">All Complete!</p>
                <p className="text-[10px] text-muted-foreground">5 of 5 tasks done</p>
              </div>
            </div>
            <span className="text-lg font-bold text-emerald-500">100%</span>
          </div>
          <div className="h-2 bg-emerald-500/20 rounded-full overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" />
          </div>
        </div>

        {/* Tasks Section - All Complete */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Today's Practice
          </h2>
          <div className="space-y-2">
            {demoTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all bg-muted/30",
                  task.justCompleted && "ring-2 ring-emerald-500/50 bg-emerald-500/5"
                )}
              >
                {/* Checkbox */}
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-muted-foreground line-through">
                    {task.label}
                  </span>
                  {task.target && (
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {task.target}
                    </span>
                  )}
                </div>

                {task.justCompleted && (
                  <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Just now
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Streak indicator */}
        <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 rounded-xl p-3">
          <Flame className="w-5 h-5 text-orange-500" />
          <span className="text-sm font-bold text-foreground">7 Day Streak!</span>
          <span className="text-lg">🔥</span>
        </div>
      </div>
      </div>
    </div>
  );
};
