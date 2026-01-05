import React from "react";
import { Button } from "@/components/ui/button";
import { X, Lightbulb, Users, Calendar, Link } from "lucide-react";

interface NudgeItem {
  id: string;
  icon: React.ElementType;
  message: string;
  actionLabel: string;
  priority: number;
}

interface ContextualNudgeProps {
  checklist: Array<{
    id: string;
    label: string;
    done: boolean;
    cta: string;
  }>;
  playersCount: number;
  scheduleConnected: boolean;
  onAction: (itemId: string) => void;
  onDismiss?: (itemId: string) => void;
}

export const ContextualNudge: React.FC<ContextualNudgeProps> = ({
  checklist,
  playersCount,
  scheduleConnected,
  onAction,
  onDismiss,
}) => {
  // Build potential nudges based on context
  const nudges: NudgeItem[] = [];

  // Priority 1: No players yet
  if (playersCount === 0) {
    const inviteItem = checklist.find(i => i.id === "add_players" || i.id === "invite_parents");
    if (inviteItem && !inviteItem.done) {
      nudges.push({
        id: inviteItem.id,
        icon: Users,
        message: "Invite players to see your practice cards",
        actionLabel: "Invite Players",
        priority: 1,
      });
    }
  }

  // Priority 2: Schedule not connected
  if (!scheduleConnected) {
    const scheduleItem = checklist.find(i => i.id === "connect_schedule");
    if (scheduleItem && !scheduleItem.done) {
      nudges.push({
        id: scheduleItem.id,
        icon: Calendar,
        message: "Connect your calendar to auto-enable game days",
        actionLabel: "Connect Schedule",
        priority: 2,
      });
    }
  }

  // Priority 3: Preferences not set
  const prefsItem = checklist.find(i => i.id === "set_preferences");
  if (prefsItem && !prefsItem.done) {
    nudges.push({
      id: prefsItem.id,
      icon: Lightbulb,
      message: "Set training preferences for smarter AI suggestions",
      actionLabel: "Set Preferences",
      priority: 3,
    });
  }

  // Sort by priority and take the first one
  nudges.sort((a, b) => a.priority - b.priority);
  const activeNudge = nudges[0];

  if (!activeNudge) {
    return null;
  }

  const Icon = activeNudge.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-team-primary/5 border border-team-primary/10">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-team-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-team-primary" />
      </div>
      <p className="flex-1 text-sm text-text-secondary">
        {activeNudge.message}
      </p>
      <Button
        size="sm"
        variant="ghost"
        className="flex-shrink-0 text-team-primary hover:text-team-primary hover:bg-team-primary/10"
        onClick={() => onAction(activeNudge.id)}
      >
        {activeNudge.actionLabel}
      </Button>
      {onDismiss && (
        <Button
          size="icon-sm"
          variant="ghost"
          className="flex-shrink-0 text-text-muted"
          onClick={() => onDismiss(activeNudge.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
