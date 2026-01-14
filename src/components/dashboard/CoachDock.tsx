import React from "react";
import { Users, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoachDockProps {
  playersCount: number;
  activeToday: number;
  onRoster: () => void;
  onProgress: () => void;
  onSettings: () => void;
}

export const CoachDock: React.FC<CoachDockProps> = ({
  playersCount,
  activeToday,
  onRoster,
  onProgress,
  onSettings,
}) => {
  const dockItems = [
    {
      id: "roster",
      icon: Users,
      label: "Roster",
      subtext: playersCount > 0 ? `${playersCount} player${playersCount !== 1 ? 's' : ''}` : "Add players",
      onClick: onRoster,
      highlighted: playersCount === 0,
    },
    {
      id: "progress",
      icon: TrendingUp,
      label: "Progress",
      subtext: activeToday > 0 ? `${activeToday} active today` : "View stats",
      onClick: onProgress,
      highlighted: false,
    },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      subtext: "Team config",
      onClick: onSettings,
      highlighted: false,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {dockItems.map(({ id, icon: Icon, label, subtext, onClick, highlighted }) => (
        <button
          key={id}
          onClick={onClick}
          className={cn(
            "flex flex-col items-center text-center p-3 rounded-xl transition-all",
            "hover:bg-muted/50 active:scale-[0.98]",
            highlighted 
              ? "bg-primary/5 border border-primary/20" 
              : "bg-surface border border-transparent"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center mb-2",
            highlighted ? "bg-primary/10" : "bg-muted/50"
          )}>
            <Icon className={cn(
              "w-5 h-5",
              highlighted ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <span className="text-xs font-medium text-foreground">{label}</span>
          <span className={cn(
            "text-[10px] mt-0.5 leading-tight",
            highlighted ? "text-primary" : "text-muted-foreground"
          )}>
            {subtext}
          </span>
        </button>
      ))}
    </div>
  );
};
