import React from "react";
import { format, parseISO, getDay } from "date-fns";

interface WeeklyHeatmapProps {
  completions: Array<{ completed_at: string }>;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const WeeklyHeatmap: React.FC<WeeklyHeatmapProps> = ({ completions }) => {
  // Count completions by day of week (0 = Sunday, 1 = Monday, etc.)
  const dayCounts = React.useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Sun through Sat
    
    completions.forEach((c) => {
      if (c.completed_at) {
        const dayIndex = getDay(parseISO(c.completed_at)); // 0 = Sunday
        counts[dayIndex]++;
      }
    });
    
    // Reorder to Mon-Sun (shift Sunday to end)
    return [...counts.slice(1), counts[0]];
  }, [completions]);

  const maxCount = Math.max(...dayCounts, 1);
  const totalCompletions = dayCounts.reduce((a, b) => a + b, 0);

  // Get intensity class based on value
  const getIntensity = (count: number) => {
    if (count === 0) return "bg-surface-muted";
    const ratio = count / maxCount;
    if (ratio < 0.25) return "bg-team-primary/20";
    if (ratio < 0.5) return "bg-team-primary/40";
    if (ratio < 0.75) return "bg-team-primary/70";
    return "bg-team-primary";
  };

  // Find best day
  const bestDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
  const bestDay = dayCounts[bestDayIndex] > 0 ? DAYS[bestDayIndex] : null;

  return (
    <div className="space-y-3">
      {/* Heatmap Grid */}
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day, idx) => (
          <div key={day} className="text-center">
            <p className="text-xs text-text-muted mb-1.5">{day}</p>
            <div
              className={`aspect-square rounded-lg flex items-center justify-center ${getIntensity(dayCounts[idx])} transition-colors`}
            >
              <span className={`text-sm font-bold ${dayCounts[idx] > 0 ? "text-white" : "text-text-muted"}`}>
                {dayCounts[idx]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend & Insights */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <span className="text-text-muted">Less</span>
          <div className="w-3 h-3 rounded bg-surface-muted" />
          <div className="w-3 h-3 rounded bg-team-primary/20" />
          <div className="w-3 h-3 rounded bg-team-primary/40" />
          <div className="w-3 h-3 rounded bg-team-primary/70" />
          <div className="w-3 h-3 rounded bg-team-primary" />
          <span className="text-text-muted">More</span>
        </div>
        {bestDay && (
          <p className="text-text-muted">
            <span className="font-medium text-foreground">{bestDay}</span> is the most active day
          </p>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
        <div className="text-center">
          <p className="text-lg font-bold">{totalCompletions}</p>
          <p className="text-xs text-text-muted">Total Sessions</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{Math.round(totalCompletions / 7)}</p>
          <p className="text-xs text-text-muted">Avg per Day</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{dayCounts.filter(c => c > 0).length}/7</p>
          <p className="text-xs text-text-muted">Active Days</p>
        </div>
      </div>
    </div>
  );
};
