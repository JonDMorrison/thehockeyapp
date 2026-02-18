import React from "react";
import { Flame, Target, Trophy, TrendingUp } from "lucide-react";

const weekDays = [
  { day: "M", level: 3 },
  { day: "T", level: 2 },
  { day: "W", level: 3 },
  { day: "T", level: 1 },
  { day: "F", level: 3 },
  { day: "S", level: 2 },
  { day: "S", level: 0 },
];

export const FeaturePlayerProgress: React.FC = () => {
  return (
    <div className="h-full w-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Player Profile
            </p>
            <h1 className="text-base font-bold text-foreground">Alex M.</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
            A
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-primary/10 rounded-xl p-3 text-center">
            <Flame className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">7</p>
            <p className="text-[9px] text-muted-foreground uppercase">Streak</p>
          </div>
          <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
            <Target className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">142</p>
            <p className="text-[9px] text-muted-foreground uppercase">Shots</p>
          </div>
          <div className="bg-amber-500/10 rounded-xl p-3 text-center">
            <Trophy className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">5</p>
            <p className="text-[9px] text-muted-foreground uppercase">Badges</p>
          </div>
        </div>

        {/* Weekly activity */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            This Week
          </p>
          <div className="flex items-end justify-between gap-2 h-24 px-2">
            {weekDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-full rounded-md transition-all ${
                    d.level === 0
                      ? "bg-muted h-2"
                      : d.level === 1
                        ? "bg-primary/30 h-8"
                        : d.level === 2
                          ? "bg-primary/60 h-14"
                          : "bg-primary h-20"
                  }`}
                />
                <span className="text-[9px] text-muted-foreground font-medium">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trend */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-3 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs font-medium">Level: Competitive</p>
            <p className="text-[10px] text-muted-foreground">Training 5x per week avg</p>
          </div>
        </div>
      </div>
    </div>
  );
};
