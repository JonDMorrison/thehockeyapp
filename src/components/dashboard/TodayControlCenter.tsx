import React from "react";
import { format } from "date-fns";
import {
  Calendar,
  Zap,
  ClipboardList,
  Sparkles,
  Eye,
  Send,
} from "lucide-react";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/app/Tag";

interface TodayControlCenterProps {
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
    tier: string | null;
    mode: string | null;
  };
  scheduleConnected: boolean;
  onCreateCard: () => void;
  onPublishCard: () => void;
  onViewCard: () => void;
  onAIDraft: () => void;
  onToggleGameDay: () => void;
}

export const TodayControlCenter: React.FC<TodayControlCenterProps> = ({
  date,
  mode,
  gameDay,
  practiceCard,
  scheduleConnected,
  onCreateCard,
  onPublishCard,
  onViewCard,
  onAIDraft,
  onToggleGameDay,
}) => {
  const formattedDate = format(new Date(date + "T12:00:00"), "EEEE, MMMM d");
  const isGameDay = mode === "game_day";

  return (
    <AppCard className="relative overflow-hidden">
      {isGameDay && (
        <div className="absolute inset-0 bg-gradient-to-br from-warning/10 to-transparent pointer-events-none" />
      )}

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-team-primary" />
            <AppCardTitle className="text-base">Today</AppCardTitle>
          </div>
          <Tag variant={isGameDay ? "warning" : "neutral"} size="sm">
            {isGameDay ? (
              <>
                <Zap className="w-3 h-3" />
                Game Day
              </>
            ) : (
              "Normal"
            )}
          </Tag>
        </div>

        <p className="text-sm text-text-muted mb-3">{formattedDate}</p>

        {/* Game info if available */}
        {isGameDay && gameDay.event_time && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 mb-4">
            <Zap className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium">
              Game at {gameDay.event_time}
              {gameDay.opponent && ` — ${gameDay.opponent}`}
            </span>
          </div>
        )}

        {/* Card status */}
        <div className="p-3 rounded-lg bg-surface-muted mb-4">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-medium">
              {practiceCard.exists
                ? practiceCard.published
                  ? practiceCard.title || "Today's Practice"
                  : "Draft ready"
                : "No practice card yet"}
            </span>
          </div>
          {practiceCard.tier && (
            <span className="text-xs text-text-muted capitalize">
              {practiceCard.tier} tier
              {practiceCard.mode === "game_day" && " • Game Day Prep"}
            </span>
          )}
        </div>

        {/* Primary action */}
        <div className="flex gap-2">
          {!practiceCard.exists ? (
            <>
              <Button
                variant="default"
                className="flex-1"
                onClick={onCreateCard}
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Create today's practice
              </Button>
              <Button
                variant="outline"
                onClick={onAIDraft}
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            </>
          ) : !practiceCard.published ? (
            <>
              <Button
                variant="default"
                className="flex-1"
                onClick={onPublishCard}
              >
                <Send className="w-4 h-4 mr-2" />
                Publish today
              </Button>
              <Button variant="outline" onClick={onViewCard}>
                <Eye className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button variant="outline" className="flex-1" onClick={onViewCard}>
              <Eye className="w-4 h-4 mr-2" />
              View today's card
            </Button>
          )}
        </div>

        {/* Game day override - only show if schedule connected or manual control needed */}
        {(scheduleConnected || !isGameDay) && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">
                {scheduleConnected && isGameDay
                  ? "Auto Game Day enabled"
                  : "Game Day Mode"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={onToggleGameDay}
              >
                {isGameDay ? "Keep as normal" : "Enable Game Day"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppCard>
  );
};
