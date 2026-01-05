import React from "react";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { ChevronRight, Flame, Target, Users } from "lucide-react";

interface TeamCelebrationProps {
  playersCount: number;
  activeToday: number;
  sessionsComplete: number;
  totalShots: number;
  onViewDetails: () => void;
}

export const TeamCelebration: React.FC<TeamCelebrationProps> = ({
  playersCount,
  activeToday,
  sessionsComplete,
  totalShots,
  onViewDetails,
}) => {
  // Only show if there's something to celebrate
  const hasActivity = activeToday > 0 || sessionsComplete > 0 || totalShots > 0;
  
  if (!hasActivity && playersCount === 0) {
    return null;
  }

  // Choose the most impressive stat to highlight
  const getHighlight = () => {
    if (totalShots >= 100) {
      return {
        icon: Target,
        value: totalShots.toLocaleString(),
        label: "shots this week",
        emoji: "🔥",
      };
    }
    if (sessionsComplete >= 3) {
      return {
        icon: Flame,
        value: sessionsComplete.toString(),
        label: "sessions complete",
        emoji: "⚡",
      };
    }
    if (activeToday > 0) {
      return {
        icon: Users,
        value: activeToday.toString(),
        label: `player${activeToday !== 1 ? 's' : ''} active today`,
        emoji: "💪",
      };
    }
    return null;
  };

  const highlight = getHighlight();

  // No celebration-worthy stats yet
  if (!highlight) {
    return (
      <AppCard variant="muted" className="text-center py-6">
        <p className="text-text-secondary text-sm">
          Activity will show here once players start practicing
        </p>
      </AppCard>
    );
  }

  return (
    <AppCard 
      className="relative overflow-hidden cursor-pointer hover:bg-surface-elevated transition-colors"
      onClick={onViewDetails}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-3xl">{highlight.emoji}</div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{highlight.value}</span>
            </div>
            <p className="text-sm text-text-secondary">{highlight.label}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm">
          <ChevronRight className="w-5 h-5 text-text-muted" />
        </Button>
      </div>
    </AppCard>
  );
};
