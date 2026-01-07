import React from "react";
import { 
  Brain, 
  CheckCircle, 
  Loader2, 
  Target, 
  Dumbbell, 
  Heart, 
  Sparkles,
  Calendar,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const generatingSteps = [
  { text: "Analyzing team preferences...", done: true },
  { text: "Building week 1...", done: true },
  { text: "Optimizing training load...", done: true },
  { text: "Adding variety...", active: true },
  { text: "Finalizing program...", done: false },
];

const previewTasks = [
  { label: "Stickhandling warmup", type: "prep", time: "5 min" },
  { label: "Wrist shots - targets", type: "shooting", time: "25 reps" },
  { label: "Quick release drill", type: "shooting", time: "15 reps" },
];

export const MarketingAIPreview: React.FC = () => {
  return (
    <div className="h-full w-full bg-background text-foreground overflow-hidden">
      {/* Safe area padding for phone notch */}
      <div className="h-6 bg-background" />
      
      {/* Scrollable content */}
      <div className="h-[calc(100%-1.5rem)] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h1 className="text-base font-bold text-foreground">Offline Program Builder</h1>
          </div>
          <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-600 px-2 py-1 rounded-full">
            <Brain className="w-3 h-3" />
            <span className="text-[10px] font-semibold">Generating</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-5">
        {/* Program Config Summary */}
        <div className="bg-muted/30 rounded-xl p-3 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Program Settings</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>4 weeks</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Zap className="w-3.5 h-3.5 text-muted-foreground" />
              <span>5 days/week</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Shooting focus</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" />
              <span>25 min/session</span>
            </div>
          </div>
        </div>

        {/* AI Generation Animation */}
        <div className="relative bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent rounded-xl p-4 border border-purple-500/20">
          {/* Animated Brain Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 -z-10 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
          </div>

          {/* Progress Steps */}
          <div className="space-y-2.5">
            {generatingSteps.map((step, i) => (
              <div
                key={step.text}
                className={cn(
                  "flex items-center gap-2.5 transition-opacity",
                  !step.done && !step.active && "opacity-40"
                )}
              >
                {step.done ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : step.active ? (
                  <Loader2 className="w-4 h-4 text-purple-500 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                <span className={cn(
                  "text-xs",
                  step.done && "text-foreground",
                  step.active && "text-purple-600 font-medium",
                  !step.done && !step.active && "text-muted-foreground"
                )}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Preview Card */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Live Preview — Day 1</p>
          </div>
          
          <div className="bg-card rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Monday — Shooting Focus</p>
              <span className="text-[10px] font-medium text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">
                REP
              </span>
            </div>
            
            <div className="space-y-1.5">
              {previewTasks.map((task, i) => (
                <div
                  key={task.label}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
                >
                  <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
                    {task.type === "shooting" ? (
                      <Target className="w-3 h-3 text-purple-500" />
                    ) : (
                      <Heart className="w-3 h-3 text-purple-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{task.label}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{task.time}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center gap-1 pt-1">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span className="text-[9px] text-muted-foreground ml-1">+2 more tasks</span>
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="flex items-center justify-around bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 rounded-xl p-3">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">20</p>
            <p className="text-[9px] text-muted-foreground uppercase">Days</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">85</p>
            <p className="text-[9px] text-muted-foreground uppercase">Tasks</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-purple-500">✨</p>
            <p className="text-[9px] text-muted-foreground uppercase">AI Built</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
