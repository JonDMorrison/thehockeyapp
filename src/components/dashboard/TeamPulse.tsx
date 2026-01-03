import React from "react";
import { Users, CheckCircle, Target, ChevronRight } from "lucide-react";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";

interface TeamPulseProps {
  playersCount: number;
  activeToday: number;
  sessionsComplete: number;
  totalShots: number;
  onViewDetails?: () => void;
}

export const TeamPulse: React.FC<TeamPulseProps> = ({
  playersCount,
  activeToday,
  sessionsComplete,
  totalShots,
  onViewDetails,
}) => {
  return (
    <AppCard>
      <div className="flex items-center justify-between mb-4">
        <AppCardTitle className="text-base">Team Pulse</AppCardTitle>
        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-text-muted"
            onClick={onViewDetails}
          >
            Details
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-surface-muted">
          <Users className="w-5 h-5 mx-auto mb-1 text-team-primary" />
          <p className="text-xl font-bold">{playersCount}</p>
          <p className="text-xs text-text-muted">Players</p>
        </div>

        <div className="text-center p-3 rounded-lg bg-surface-muted">
          <CheckCircle className="w-5 h-5 mx-auto mb-1 text-success" />
          <p className="text-xl font-bold">{sessionsComplete}</p>
          <p className="text-xs text-text-muted">Complete</p>
        </div>

        <div className="text-center p-3 rounded-lg bg-surface-muted">
          <Target className="w-5 h-5 mx-auto mb-1 text-team-primary" />
          <p className="text-xl font-bold">
            {totalShots >= 1000
              ? `${(totalShots / 1000).toFixed(1)}k`
              : totalShots}
          </p>
          <p className="text-xs text-text-muted">Shots</p>
        </div>
      </div>

      {playersCount > 0 && activeToday > 0 && (
        <p className="text-xs text-text-muted text-center mt-3">
          {activeToday} of {playersCount} players active today
        </p>
      )}
    </AppCard>
  );
};
