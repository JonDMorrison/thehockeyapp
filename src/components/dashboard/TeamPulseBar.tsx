import React from "react";
import { motion } from "framer-motion";
import { Users, Flame, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamPulseBarProps {
  playersCount: number;
  activeToday: number;
  sessionsComplete: number;
  className?: string;
}

export const TeamPulseBar: React.FC<TeamPulseBarProps> = ({
  playersCount,
  activeToday,
  sessionsComplete,
  className,
}) => {
  const engagementRate = playersCount > 0 
    ? Math.round((activeToday / playersCount) * 100) 
    : 0;

  const stats = [
    {
      id: "roster",
      icon: Users,
      value: playersCount,
      label: "Players",
    },
    {
      id: "active",
      icon: Flame,
      value: activeToday,
      label: "Active Today",
      highlight: activeToday > 0,
    },
    {
      id: "sessions",
      icon: Target,
      value: sessionsComplete,
      label: "Complete",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center justify-between p-3 rounded-xl",
        "bg-muted/50 border border-border",
        className
      )}
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <React.Fragment key={stat.id}>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                stat.highlight ? "bg-primary/10" : "bg-background"
              )}>
                <Icon className={cn(
                  "w-4 h-4",
                  stat.highlight ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "text-sm font-semibold leading-none",
                  stat.highlight ? "text-primary" : "text-foreground"
                )}>
                  {stat.value}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {stat.label}
                </span>
              </div>
            </div>
            {index < stats.length - 1 && (
              <div className="h-8 w-px bg-border" />
            )}
          </React.Fragment>
        );
      })}
      
      {/* Engagement indicator */}
      {playersCount > 0 && (
        <>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className={cn(
                "text-sm font-semibold leading-none",
                engagementRate >= 50 ? "text-green-600" : "text-muted-foreground"
              )}>
                {engagementRate}%
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                Rate
              </span>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};
