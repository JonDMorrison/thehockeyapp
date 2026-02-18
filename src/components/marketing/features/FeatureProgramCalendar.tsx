import React from "react";
import { Calendar, Check, Flame } from "lucide-react";

const days = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  completed: i < 12,
  isToday: i === 12,
}));

export const FeatureProgramCalendar: React.FC = () => {
  const completedCount = days.filter(d => d.completed).length;

  return (
    <div className="h-full w-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              30-Day Challenge
            </p>
            <h1 className="text-base font-bold text-foreground">Summer Skills</h1>
          </div>
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-full">
            <Calendar className="w-3 h-3" />
            <span className="text-[10px] font-semibold">Day {completedCount + 1}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-muted-foreground">Progress</span>
            <span className="text-[10px] font-bold text-primary">{Math.round((completedCount / 30) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(completedCount / 30) * 100}%` }}
            />
          </div>
        </div>

        {/* Calendar grid */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            June 2026
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-[8px] font-medium text-muted-foreground pb-1">
                {d}
              </div>
            ))}
            {/* Offset for starting day (Monday) */}
            <div />
            {days.map((day) => (
              <div
                key={day.day}
                className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-medium relative ${
                  day.completed
                    ? "bg-primary text-white"
                    : day.isToday
                      ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                      : "bg-muted/40 text-muted-foreground"
                }`}
              >
                {day.completed ? (
                  <Check className="w-3 h-3" strokeWidth={3} />
                ) : (
                  day.day
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Streak */}
        <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/5 rounded-xl p-3 flex items-center gap-3 border border-orange-500/15">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium">12 day streak!</p>
            <p className="text-[10px] text-muted-foreground">Keep it going</p>
          </div>
        </div>
      </div>
    </div>
  );
};
