import React from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Target, 
  Users, 
  Zap,
  Trophy,
  Star,
  ArrowUpRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TeamProgressWidgetProps {
  playersCount: number;
  activeToday: number;
  sessionsComplete: number;
  shotsLogged: number;
  className?: string;
}

export const TeamProgressWidget: React.FC<TeamProgressWidgetProps> = ({
  playersCount,
  activeToday,
  sessionsComplete,
  shotsLogged,
  className,
}) => {
  // Calculate engagement rate
  const engagementRate = playersCount > 0 
    ? Math.round((activeToday / playersCount) * 100) 
    : 0;

  // Simulate weekly trend (in production, this would come from real data)
  const weeklyTrend = sessionsComplete > 3 ? "up" : sessionsComplete > 0 ? "stable" : "down";
  const trendPercentage = weeklyTrend === "up" ? 12 : weeklyTrend === "down" ? -8 : 0;

  // Calculate team momentum score
  const momentumScore = Math.min(
    Math.round((engagementRate * 0.4) + (sessionsComplete * 5) + (shotsLogged * 0.1)),
    100
  );

  // Streak simulation (would come from real data)
  const streakDays = sessionsComplete > 0 ? Math.min(sessionsComplete, 7) : 0;

  const statCards = [
    {
      label: "Team Momentum",
      value: momentumScore,
      suffix: "%",
      icon: Zap,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-500/10",
      description: momentumScore >= 70 ? "On fire!" : momentumScore >= 40 ? "Building steam" : "Getting started",
    },
    {
      label: "Engagement",
      value: engagementRate,
      suffix: "%",
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
      description: `${activeToday} of ${playersCount} active`,
    },
    {
      label: "Sessions",
      value: sessionsComplete,
      suffix: "",
      icon: Target,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-500/10",
      description: "Completed today",
    },
    {
      label: "Shots",
      value: shotsLogged,
      suffix: "",
      icon: Trophy,
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10",
      description: "Logged today",
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with trend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Team Progress</h3>
            <p className="text-xs text-muted-foreground">Today's activity</p>
          </div>
        </div>
        
        {/* Streak Badge */}
        {streakDays > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20"
          >
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-orange-600">{streakDays}</span>
            <span className="text-xs text-muted-foreground">day streak</span>
          </motion.div>
        )}
      </div>

      {/* Momentum Bar */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Team Momentum</span>
            <div className="flex items-center gap-1">
              {weeklyTrend === "up" ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : weeklyTrend === "down" ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : null}
              {trendPercentage !== 0 && (
                <span className={cn(
                  "text-xs font-medium",
                  trendPercentage > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {trendPercentage > 0 ? "+" : ""}{trendPercentage}%
                </span>
              )}
            </div>
          </div>
          
          {/* Progress bar with glow effect */}
          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${momentumScore}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary/80"
              style={{
                boxShadow: momentumScore > 50 ? "0 0 20px hsl(var(--primary) / 0.5)" : undefined
              }}
            />
            {/* Animated shimmer */}
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            />
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold">{momentumScore}%</span>
            <span className="text-xs text-muted-foreground">
              {momentumScore >= 70 ? "🔥 Crushing it!" : momentumScore >= 40 ? "💪 Keep going!" : "🚀 Let's build!"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.slice(1).map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    stat.bgColor
                  )}>
                    <stat.icon className="w-4 h-4" style={{
                      color: stat.color.includes("blue") ? "#3b82f6" :
                             stat.color.includes("green") ? "#22c55e" :
                             stat.color.includes("purple") ? "#a855f7" : "#f59e0b"
                    }} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold">{stat.value}</span>
                    <span className="text-sm text-muted-foreground">{stat.suffix}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xs text-muted-foreground/70">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Insights */}
      {(activeToday > 0 || shotsLogged > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-2 p-3 rounded-lg bg-muted/50"
        >
          <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            {activeToday === playersCount && playersCount > 0 ? (
              <span><span className="font-medium text-foreground">Full team participation!</span> Everyone's putting in work today.</span>
            ) : shotsLogged >= 100 ? (
              <span>Your team has logged <span className="font-medium text-foreground">{shotsLogged} shots</span> today – great effort!</span>
            ) : activeToday > 0 ? (
              <span><span className="font-medium text-foreground">{activeToday} players</span> are working on their game today.</span>
            ) : (
              <span>No activity yet today. Time to get the team moving!</span>
            )}
          </p>
        </motion.div>
      )}
    </div>
  );
};
