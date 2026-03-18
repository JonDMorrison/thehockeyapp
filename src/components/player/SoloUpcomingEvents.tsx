import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, differenceInHours, isToday, isTomorrow } from "date-fns";
import { Calendar, Zap, Users, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface SoloUpcomingEventsProps {
  playerId: string;
  onConnectSchedule?: () => void;
}

export function SoloUpcomingEvents({ playerId, onConnectSchedule }: SoloUpcomingEventsProps) {
  const { t } = useTranslation();

  // Check if schedule is connected
  const { data: source } = useQuery({
    queryKey: ["solo-schedule-source", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solo_schedule_sources")
        .select("id, last_synced_at")
        .eq("player_id", playerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch upcoming events
  const { data: events } = useQuery({
    queryKey: ["solo-events-widget", playerId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("solo_events")
        .select("*")
        .eq("player_id", playerId)
        .eq("is_cancelled", false)
        .gte("start_time", now)
        .order("start_time", { ascending: true })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!source,
  });

  // Not connected - show connect prompt
  if (!source) {
    return (
      <button
        onClick={onConnectSchedule}
        className="w-full p-4 rounded-xl border border-dashed border-border bg-card hover:border-primary/50 hover:bg-muted/50 transition-all text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t("players.soloUpcomingEvents.connectSchedule")}</p>
            <p className="text-xs text-muted-foreground">{t("players.soloUpcomingEvents.smartTraining")}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>
    );
  }

  // Connected but no events
  if (!events || events.length === 0) {
    return (
      <div className="p-4 bg-card border border-border rounded-xl">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">{t("players.soloUpcomingEvents.noUpcoming")}</span>
        </div>
      </div>
    );
  }

  // Get next game and next practice
  const nextGame = events.find((e) => e.event_type === "game");
  const nextPractice = events.find((e) => e.event_type === "practice");

  const formatCountdown = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return t("common.today");
    if (isTomorrow(date)) return t("common.tomorrow");
    const days = differenceInDays(date, new Date());
    if (days === 0) {
      const hours = differenceInHours(date, new Date());
      return `${hours}h`;
    }
    return `${days}d`;
  };

  return (
    <div className="p-4 bg-card border border-border rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{t("players.soloUpcomingEvents.schedule")}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Next Game */}
        {nextGame ? (
          <div className="p-3 bg-amber-500/10 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-600">{t("players.soloUpcomingEvents.game")}</span>
            </div>
            <p className="text-lg font-bold text-amber-600">{formatCountdown(nextGame.start_time)}</p>
            <p className="text-xs text-muted-foreground truncate">
              {format(new Date(nextGame.start_time), "EEE h:mma")}
            </p>
          </div>
        ) : (
          <div className="p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{t("players.soloUpcomingEvents.game")}</span>
            </div>
            <p className="text-sm text-muted-foreground">—</p>
          </div>
        )}

        {/* Next Practice */}
        {nextPractice ? (
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">{t("players.soloUpcomingEvents.practice")}</span>
            </div>
            <p className="text-lg font-bold text-blue-600">{formatCountdown(nextPractice.start_time)}</p>
            <p className="text-xs text-muted-foreground truncate">
              {format(new Date(nextPractice.start_time), "EEE h:mma")}
            </p>
          </div>
        ) : (
          <div className="p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{t("players.soloUpcomingEvents.practice")}</span>
            </div>
            <p className="text-sm text-muted-foreground">—</p>
          </div>
        )}
      </div>
    </div>
  );
}
