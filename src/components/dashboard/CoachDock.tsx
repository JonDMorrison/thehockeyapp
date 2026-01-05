import React from "react";
import { Button } from "@/components/ui/button";
import { Users, Calendar, TrendingUp, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoachDockProps {
  playersCount: number;
  weekPlanStatus?: string; // e.g., "Week 2 of 4"
  activeToday: number;
  hasPlayers: boolean;
  onRoster: () => void;
  onWeekPlan: () => void;
  onProgress: () => void;
  onInvite: () => void;
}

export const CoachDock: React.FC<CoachDockProps> = ({
  playersCount,
  weekPlanStatus,
  activeToday,
  hasPlayers,
  onRoster,
  onWeekPlan,
  onProgress,
  onInvite,
}) => {
  // Invite should be highlighted if no players yet
  const inviteHighlighted = !hasPlayers;

  const dockItems = [
    {
      id: "roster",
      icon: Users,
      label: "Roster",
      subtext: playersCount > 0 ? `${playersCount} player${playersCount !== 1 ? 's' : ''}` : "Add players",
      onClick: onRoster,
      highlighted: false,
    },
    {
      id: "plan",
      icon: Calendar,
      label: "Weekly Plan",
      subtext: weekPlanStatus || "Plan workouts",
      onClick: onWeekPlan,
      highlighted: false,
    },
    {
      id: "progress",
      icon: TrendingUp,
      label: "Activity",
      subtext: activeToday > 0 ? `${activeToday} active today` : "View progress",
      onClick: onProgress,
      highlighted: false,
    },
    {
      id: "invite",
      icon: UserPlus,
      label: "Share",
      subtext: "Invite families",
      onClick: onInvite,
      highlighted: inviteHighlighted,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {dockItems.map(({ id, icon: Icon, label, subtext, onClick, highlighted }) => (
        <button
          key={id}
          onClick={onClick}
          className={cn(
            "flex flex-col items-center text-center p-3 rounded-xl transition-all",
            "hover:bg-muted/50 active:scale-[0.98]",
            highlighted 
              ? "bg-team-primary/5 border border-team-primary/20" 
              : "bg-surface border border-transparent"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center mb-2",
            highlighted ? "bg-team-primary/10" : "bg-muted/50"
          )}>
            <Icon className={cn(
              "w-5 h-5",
              highlighted ? "text-team-primary" : "text-text-secondary"
            )} />
          </div>
          <span className="text-xs font-medium text-foreground">{label}</span>
          <span className={cn(
            "text-[10px] mt-0.5 leading-tight",
            highlighted ? "text-team-primary" : "text-text-muted"
          )}>
            {subtext}
          </span>
        </button>
      ))}
    </div>
  );
};
