import React from "react";
import { format } from "date-fns";

interface TodayHeaderProps {
  teamName: string;
  seasonLabel?: string | null;
  date: string;
  mode: "normal" | "game_day";
  gameDay: {
    enabled: boolean;
    event_time: string | null;
    opponent: string | null;
  };
}

export const TodayHeader: React.FC<TodayHeaderProps> = ({
  teamName,
  seasonLabel,
  date,
  mode,
  gameDay,
}) => {
  const dateObj = new Date(date);
  const formattedDate = format(dateObj, "EEE, MMM d").toUpperCase();

  const isGameDay = mode === "game_day" || gameDay.enabled;

  // Format game time if available
  const gameTime = gameDay.event_time 
    ? format(new Date(gameDay.event_time), "h:mm a")
    : null;

  return (
    <div className="space-y-1">
      {/* Date and Day Type */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wider text-text-muted">
            TODAY — {formattedDate}
          </span>
        </div>
        
        {/* Day Type Pill */}
        {isGameDay ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            Game Day
            {gameTime && <span className="text-destructive/70">· {gameTime}</span>}
            {gameDay.opponent && <span className="text-destructive/70">vs {gameDay.opponent}</span>}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Practice Day
          </span>
        )}
      </div>
      
      {/* Team Name */}
      <div className="flex items-baseline gap-2">
        <h1 className="text-lg font-bold text-foreground">{teamName}</h1>
        {seasonLabel && (
          <span className="text-sm text-text-muted">· {seasonLabel}</span>
        )}
      </div>
    </div>
  );
};
