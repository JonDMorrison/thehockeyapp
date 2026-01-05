import React from "react";
import { useNavigate } from "react-router-dom";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Check, 
  Zap, 
  Calendar,
  Sparkles,
  PartyPopper
} from "lucide-react";

interface TodayHeroCardProps {
  teamId: string;
  date: string;
  mode: "normal" | "game_day";
  gameDay: {
    enabled: boolean;
    event_time: string | null;
    opponent: string | null;
  };
  practiceCard: {
    exists: boolean;
    published: boolean;
    card_id: string | null;
    title: string | null;
  };
  hasWeekPlan: boolean;
  onPublish: () => void;
  onToggleGameDay: () => void;
}

type HeroState = "game_day" | "ready_to_publish" | "all_set" | "create_practice" | "plan_week";

function getHeroState(props: TodayHeroCardProps): HeroState {
  const { mode, practiceCard, hasWeekPlan } = props;
  
  // Game day takes priority
  if (mode === "game_day") {
    return "game_day";
  }
  
  // Practice exists but not published
  if (practiceCard.exists && !practiceCard.published) {
    return "ready_to_publish";
  }
  
  // Practice published - all set!
  if (practiceCard.exists && practiceCard.published) {
    return "all_set";
  }
  
  // No practice for today - suggest creating
  if (!practiceCard.exists && hasWeekPlan) {
    return "create_practice";
  }
  
  // No week plan at all
  return "plan_week";
}

const heroContent: Record<HeroState, {
  icon: React.ElementType;
  emoji: string;
  title: string;
  subtitle: string;
  buttonLabel?: string;
  buttonVariant?: "default" | "team" | "ghost";
  celebration?: boolean;
}> = {
  game_day: {
    icon: Zap,
    emoji: "🏒",
    title: "Game Day!",
    subtitle: "Focus mode is on. Players see rest protocols today.",
    buttonLabel: "Manage Game Day",
    buttonVariant: "team",
    celebration: true,
  },
  ready_to_publish: {
    icon: Play,
    emoji: "📋",
    title: "Ready to go live",
    subtitle: "Today's practice is ready. Tap to publish to players.",
    buttonLabel: "Publish Now",
    buttonVariant: "default",
  },
  all_set: {
    icon: Check,
    emoji: "✅",
    title: "You're all set!",
    subtitle: "Today's practice is live. Players are working on it.",
    celebration: true,
  },
  create_practice: {
    icon: Sparkles,
    emoji: "✨",
    title: "Assign today's practice",
    subtitle: "Pick exercises and publish in seconds.",
    buttonLabel: "Assign Practice",
    buttonVariant: "default",
  },
  plan_week: {
    icon: Sparkles,
    emoji: "✨",
    title: "Assign today's practice",
    subtitle: "Pick exercises and publish in seconds.",
    buttonLabel: "Assign Practice",
    buttonVariant: "default",
  },
};

export const TodayHeroCard: React.FC<TodayHeroCardProps> = (props) => {
  const navigate = useNavigate();
  const state = getHeroState(props);
  const content = heroContent[state];
  const Icon = content.icon;

  const handleAction = () => {
    switch (state) {
      case "game_day":
        props.onToggleGameDay();
        break;
      case "ready_to_publish":
        props.onPublish();
        break;
      case "create_practice":
      case "plan_week":
        navigate(`/teams/${props.teamId}/assign`);
        break;
    }
  };

  return (
    <AppCard className="relative overflow-hidden">
      {/* Celebration background effect */}
      {content.celebration && (
        <div className="absolute inset-0 bg-gradient-to-br from-team-primary/10 via-transparent to-team-tertiary/10 pointer-events-none" />
      )}
      
      <div className="relative flex flex-col items-center text-center py-4">
        {/* Icon/Emoji */}
        <div className="text-5xl mb-4" role="img" aria-label={content.title}>
          {content.emoji}
        </div>
        
        {/* Title */}
        <h2 className="text-xl font-bold mb-1">{content.title}</h2>
        
        {/* Subtitle */}
        <p className="text-sm text-text-secondary mb-6 max-w-xs">
          {content.subtitle}
        </p>
        
        {/* Primary Action */}
        {content.buttonLabel && (
          <Button
            size="lg"
            variant={content.buttonVariant}
            onClick={handleAction}
            className="min-w-[180px]"
          >
            <Icon className="w-4 h-4 mr-2" />
            {content.buttonLabel}
          </Button>
        )}
        
        {/* All set state shows celebration icon */}
        {state === "all_set" && (
          <div className="flex items-center gap-2 text-team-primary">
            <PartyPopper className="w-5 h-5" />
            <span className="text-sm font-medium">Come back tomorrow</span>
          </div>
        )}
      </div>
    </AppCard>
  );
};
