import React from "react";
import { Users, CheckCircle, Clock, TrendingUp } from "lucide-react";

const players = [
  { name: "Alex", initial: "A", completed: true, time: "2:30 PM" },
  { name: "Jordan", initial: "J", completed: true, time: "3:15 PM" },
  { name: "Sam", initial: "S", completed: true, time: "4:00 PM" },
  { name: "Riley", initial: "R", completed: false },
  { name: "Casey", initial: "C", completed: false },
];

export const FeatureCoachView: React.FC = () => {
  const completedCount = players.filter(p => p.completed).length;
  
  return (
    <div className="h-full w-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Team Dashboard
            </p>
            <h1 className="text-base font-bold text-foreground">Northside Wolves</h1>
          </div>
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-full">
            <Users className="w-3 h-3" />
            <span className="text-[10px] font-semibold">Coach View</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-emerald-600">{completedCount}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Done</p>
          </div>
          <div className="bg-amber-500/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-amber-600">{players.length - completedCount}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Pending</p>
          </div>
          <div className="bg-primary/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-primary">60%</p>
            <p className="text-[9px] text-muted-foreground uppercase">Rate</p>
          </div>
        </div>

        {/* Player list */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Today's Activity
          </p>
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.name}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  player.completed ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-muted/30"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  player.completed ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {player.initial}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{player.name}</p>
                  {player.completed ? (
                    <p className="text-[10px] text-emerald-600">Completed at {player.time}</p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Not yet started</p>
                  )}
                </div>
                {player.completed && (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trend */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-3 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs font-medium">Great week!</p>
            <p className="text-[10px] text-muted-foreground">Completion up 15% vs last week</p>
          </div>
        </div>
      </div>
    </div>
  );
};
