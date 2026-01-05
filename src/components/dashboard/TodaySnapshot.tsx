import React from "react";

interface TodaySnapshotProps {
  playersActive: number;
  sessionsComplete: number;
  shotsLogged: number;
}

export const TodaySnapshot: React.FC<TodaySnapshotProps> = ({
  playersActive,
  sessionsComplete,
  shotsLogged,
}) => {
  // Only show if there's any activity
  const hasActivity = playersActive > 0 || sessionsComplete > 0 || shotsLogged > 0;
  
  if (!hasActivity) return null;

  const formatShots = (shots: number) => {
    if (shots >= 1000) {
      return `${(shots / 1000).toFixed(1)}k`;
    }
    return shots.toLocaleString();
  };

  return (
    <div className="flex items-center justify-center gap-6 py-3 text-center">
      <div className="space-y-0.5">
        <p className="text-lg font-semibold text-foreground">{playersActive}</p>
        <p className="text-xs text-text-muted">active today</p>
      </div>
      
      <div className="w-px h-8 bg-border" />
      
      <div className="space-y-0.5">
        <p className="text-lg font-semibold text-foreground">{sessionsComplete}</p>
        <p className="text-xs text-text-muted">complete</p>
      </div>
      
      <div className="w-px h-8 bg-border" />
      
      <div className="space-y-0.5">
        <p className="text-lg font-semibold text-foreground">{formatShots(shotsLogged)}</p>
        <p className="text-xs text-text-muted">shots</p>
      </div>
    </div>
  );
};
