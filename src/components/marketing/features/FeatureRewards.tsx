import React from "react";
import { Trophy, Star, Flame, Medal } from "lucide-react";

const badges = [
  { icon: Flame, label: "7 Day Streak", earned: true, color: "text-orange-500 bg-orange-500/10" },
  { icon: Trophy, label: "Perfect Week", earned: true, color: "text-amber-500 bg-amber-500/10" },
  { icon: Star, label: "100 Shots", earned: true, color: "text-yellow-500 bg-yellow-500/10" },
  { icon: Medal, label: "First Month", earned: false, color: "text-muted-foreground bg-muted" },
];

export const FeatureRewards: React.FC = () => {
  return (
    <div className="h-full w-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h1 className="text-base font-bold text-foreground">Badges & Rewards</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* New badge celebration */}
        <div className="relative bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 rounded-xl p-4 text-white overflow-hidden">
          <div className="absolute top-2 right-3">
            <Star className="w-4 h-4 fill-white/50 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-white/80">🎉 New Badge!</p>
              <p className="text-lg font-bold">Perfect Week</p>
              <p className="text-[10px] text-white/80">All tasks done for 7 days</p>
            </div>
          </div>
        </div>

        {/* Badge grid */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Your Badges
          </p>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.label}
                className={`p-3 rounded-xl border ${
                  badge.earned ? "border-border bg-card" : "border-dashed border-muted-foreground/30 opacity-50"
                }`}
              >
                <div className={`w-10 h-10 rounded-full ${badge.color} flex items-center justify-center mb-2`}>
                  <badge.icon className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium">{badge.label}</p>
                {!badge.earned && (
                  <p className="text-[9px] text-muted-foreground">Keep going!</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Streak */}
        <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-bold">7 Day Streak!</span>
            </div>
            <span className="text-2xl">🔥</span>
          </div>
        </div>
      </div>
    </div>
  );
};
