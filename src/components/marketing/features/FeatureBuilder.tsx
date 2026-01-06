import React from "react";
import { Sparkles, Plus, Target, Dumbbell, Heart, Clock, GripVertical } from "lucide-react";

const taskTypes = [
  { icon: Target, label: "Shooting", color: "bg-blue-500" },
  { icon: Dumbbell, label: "Conditioning", color: "bg-orange-500" },
  { icon: Heart, label: "Mobility", color: "bg-pink-500" },
];

const draftTasks = [
  { label: "Stickhandling warmup", time: "5 min", type: "prep" },
  { label: "Wrist shots - targets", time: "25 reps", type: "shooting" },
];

export const FeatureBuilder: React.FC = () => {
  return (
    <div className="h-full w-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-foreground">Build Practice</h1>
          <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-600 px-2 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />
            <span className="text-[10px] font-semibold">AI Assist</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Date & tier */}
        <div className="flex gap-2">
          <div className="flex-1 bg-muted/50 rounded-lg p-2.5">
            <p className="text-[9px] text-muted-foreground uppercase">Date</p>
            <p className="text-xs font-medium">Mon, Jan 6</p>
          </div>
          <div className="flex-1 bg-purple-500/10 rounded-lg p-2.5 border border-purple-500/30">
            <p className="text-[9px] text-purple-600 uppercase">Tier</p>
            <p className="text-xs font-medium text-purple-600">REP</p>
          </div>
        </div>

        {/* Quick add */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Quick Add
          </p>
          <div className="flex gap-2">
            {taskTypes.map((type) => (
              <button
                key={type.label}
                className="flex-1 flex flex-col items-center gap-1 p-2 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className={`w-6 h-6 rounded-md ${type.color} flex items-center justify-center`}>
                  <type.icon className="w-3 h-3 text-white" />
                </div>
                <span className="text-[9px] font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Draft tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Tasks
            </p>
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>~20 min</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {draftTasks.map((task) => (
              <div
                key={task.label}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                <div className="flex-1">
                  <p className="text-xs font-medium">{task.label}</p>
                  <p className="text-[9px] text-muted-foreground">{task.time}</p>
                </div>
              </div>
            ))}
            
            {/* Add button */}
            <button className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-xs font-medium">Add Task</span>
            </button>
          </div>
        </div>

        {/* AI button */}
        <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-3 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">Generate with AI</span>
        </button>
      </div>
    </div>
  );
};
