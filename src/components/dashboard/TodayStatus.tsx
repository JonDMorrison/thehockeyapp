import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, Check, Zap, Eye, Sparkles } from "lucide-react";

interface TodayStatusProps {
  teamId: string;
  mode: "normal" | "game_day";
  practiceCard: {
    exists: boolean;
    published: boolean;
    card_id: string | null;
    title: string | null;
    tier?: string | null;
    mode?: string | null;
  };
  onPublish: () => void;
  onToggleGameDay: () => void;
}

type DayState = 
  | "game_day" 
  | "draft_ready" 
  | "published" 
  | "no_workout";

function getDayState(props: TodayStatusProps): DayState {
  const { mode, practiceCard } = props;
  
  if (mode === "game_day") return "game_day";
  if (practiceCard.exists && practiceCard.published) return "published";
  if (practiceCard.exists && !practiceCard.published) return "draft_ready";
  return "no_workout";
}

const stateConfig: Record<DayState, {
  statusText: string;
  buttonLabel: string;
  buttonIcon: React.ElementType;
  buttonVariant: "default" | "team" | "outline" | "ghost";
  action: "publish" | "view" | "assign" | "gameday";
}> = {
  game_day: {
    statusText: "Game Day Prep is active",
    buttonLabel: "Manage Game Day",
    buttonIcon: Zap,
    buttonVariant: "outline",
    action: "gameday",
  },
  draft_ready: {
    statusText: "Draft ready — not published yet",
    buttonLabel: "Review & Publish",
    buttonIcon: Play,
    buttonVariant: "team",
    action: "publish",
  },
  published: {
    statusText: "Today's workout is live",
    buttonLabel: "View Workout",
    buttonIcon: Eye,
    buttonVariant: "outline",
    action: "view",
  },
  no_workout: {
    statusText: "No workout published yet",
    buttonLabel: "Publish Today's Plan",
    buttonIcon: Sparkles,
    buttonVariant: "team",
    action: "assign",
  },
};

export const TodayStatus: React.FC<TodayStatusProps> = (props) => {
  const navigate = useNavigate();
  const state = getDayState(props);
  const config = stateConfig[state];
  const Icon = config.buttonIcon;

  const handleAction = () => {
    switch (config.action) {
      case "publish":
        props.onPublish();
        break;
      case "view":
        if (props.practiceCard.card_id) {
          navigate(`/teams/${props.teamId}/practice/${props.practiceCard.card_id}`);
        }
        break;
      case "assign":
        navigate(`/teams/${props.teamId}/assign`);
        break;
      case "gameday":
        props.onToggleGameDay();
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Line */}
      <p className="text-sm text-text-secondary">{config.statusText}</p>
      
      {/* Primary Action Button */}
      <Button
        size="lg"
        variant={config.buttonVariant}
        onClick={handleAction}
        className="w-full rounded-xl h-12 text-base font-semibold"
      >
        <Icon className="w-4 h-4 mr-2" />
        {config.buttonLabel}
      </Button>
      
      {/* Secondary Actions (only for no_workout state) */}
      {state === "no_workout" && (
        <div className="flex items-center justify-center gap-4 pt-1">
          <button
            onClick={() => navigate(`/teams/${props.teamId}/builder`)}
            className="text-xs text-text-muted hover:text-team-primary transition-colors"
          >
            Build with AI
          </button>
          <span className="text-text-disabled">·</span>
          <button
            onClick={() => navigate(`/templates`)}
            className="text-xs text-text-muted hover:text-team-primary transition-colors"
          >
            Use template
          </button>
        </div>
      )}
    </div>
  );
};
