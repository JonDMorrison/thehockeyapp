import React from "react";
import { format, parseISO } from "date-fns";
import { Calendar, MapPin, Zap, Users, ChevronRight, RefreshCw } from "lucide-react";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/EmptyState";

interface Event {
  id: string;
  event_type: string;
  title: string | null;
  start_time: string;
  location: string | null;
}

interface UpcomingEventsProps {
  events: Event[];
  scheduleConnected: boolean;
  lastSyncedAt?: string | null;
  isSyncing?: boolean;
  onConnectSchedule?: () => void;
  onSyncSchedule?: () => void;
  onViewAll?: () => void;
}

export const UpcomingEvents: React.FC<UpcomingEventsProps> = ({
  events,
  scheduleConnected,
  lastSyncedAt,
  isSyncing,
  onConnectSchedule,
  onSyncSchedule,
  onViewAll,
}) => {
  if (!scheduleConnected) {
    return (
      <AppCard variant="muted">
        <EmptyState
          icon={Calendar}
          title="Connect your schedule"
          description="Sync your TeamSnap schedule to see upcoming games and auto-enable Game Day Prep."
          action={
            onConnectSchedule
              ? {
                  label: "Connect TeamSnap",
                  onClick: onConnectSchedule,
                }
              : undefined
          }
        />
      </AppCard>
    );
  }

  if (events.length === 0) {
    return (
      <AppCard variant="muted">
        <AppCardTitle className="text-base mb-1">Upcoming</AppCardTitle>
        <AppCardDescription>No upcoming events found.</AppCardDescription>
      </AppCard>
    );
  }

  return (
    <AppCard>
      <div className="flex items-center justify-between mb-4">
        <div>
          <AppCardTitle className="text-base">Upcoming</AppCardTitle>
          {lastSyncedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Synced {format(new Date(lastSyncedAt), "MMM d 'at' h:mm a")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onSyncSchedule && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={onSyncSchedule}
              disabled={isSyncing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync"}
            </Button>
          )}
          {onViewAll && events.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={onViewAll}
            >
              View all
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {events.slice(0, 3).map((event) => {
          const eventDate = parseISO(event.start_time);
          const isGame = event.event_type === "game";

          return (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isGame
                    ? "bg-warning/20 text-warning"
                    : "bg-team-primary/20 text-team-primary"
                }`}
              >
                {isGame ? (
                  <Zap className="w-4 h-4" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {event.title || (isGame ? "Game" : "Practice")}
                </p>
                <p className="text-xs text-text-muted">
                  {format(eventDate, "EEE, MMM d")} at{" "}
                  {format(eventDate, "h:mm a")}
                </p>
                {event.location && (
                  <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppCard>
  );
};
