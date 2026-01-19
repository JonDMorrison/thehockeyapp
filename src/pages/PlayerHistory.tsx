import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { teamPalettes } from "@/lib/themes";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { format, subDays, parseISO } from "date-fns";
import {
  ChevronLeft,
  Calendar,
  Check,
  Clock,
  X,
} from "lucide-react";

const tierLabels: Record<string, string> = {
  rec: "Rec",
  rep: "Rep",
  elite: "Elite",
};

const statusIcons: Record<string, React.ReactNode> = {
  complete: <Check className="w-4 h-4" />,
  partial: <Clock className="w-4 h-4" />,
  none: <X className="w-4 h-4" />,
};

const statusLabels: Record<string, string> = {
  complete: "Complete",
  partial: "Partial",
  none: "Not started",
};

const PlayerHistory: React.FC = () => {
  const { id: playerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch player
  const { data: player } = useQuery({
    queryKey: ["player", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!playerId,
  });

  // Fetch player's active team
  const { data: teamData } = useQuery({
    queryKey: ["player-active-team", playerId],
    queryFn: async () => {
      const { data: pref } = await supabase
        .from("player_team_preferences")
        .select("active_team_id")
        .eq("player_id", playerId!)
        .maybeSingle();

      if (!pref?.active_team_id) return null;

      const { data: team, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", pref.active_team_id)
        .single();

      if (error) throw error;
      return team;
    },
    enabled: !!user && !!playerId,
  });

  // Fetch last 7 days of practice cards with session completions
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["player-history", teamData?.id, playerId],
    queryFn: async () => {
      const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
      const today = format(new Date(), "yyyy-MM-dd");

      // Get practice cards
      const { data: cards, error: cardsError } = await supabase
        .from("practice_cards")
        .select(`
          id,
          date,
          tier,
          title,
          practice_tasks (id)
        `)
        .eq("team_id", teamData!.id)
        .gte("date", sevenDaysAgo)
        .lte("date", today)
        .not("published_at", "is", null)
        .order("date", { ascending: false });

      if (cardsError) throw cardsError;

      // Get session completions
      const cardIds = cards.map((c) => c.id);
      const { data: sessions, error: sessionsError } = await supabase
        .from("session_completions")
        .select("*")
        .in("practice_card_id", cardIds)
        .eq("player_id", playerId!);

      if (sessionsError) throw sessionsError;

      const sessionMap: Record<string, any> = {};
      sessions.forEach((s) => {
        sessionMap[s.practice_card_id] = s;
      });

      return cards.map((card) => ({
        ...card,
        session: sessionMap[card.id] || null,
      }));
    },
    enabled: !!teamData?.id && !!playerId,
  });

  // Apply team theme
  useEffect(() => {
    if (teamData?.palette_id) {
      setTeamTheme(teamData.palette_id);
    }
  }, [teamData?.palette_id, setTeamTheme]);

  const palette = teamData ? teamPalettes.find((p) => p.id === teamData.palette_id) : null;
  const isLoading = authLoading || historyLoading;

  // Show loading state while auth or data is loading
  if (isLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  // If not authenticated, render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/today")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">History</h1>
            <p className="text-xs text-text-muted">Last 7 days</p>
          </div>
          {player && (
            <Avatar
              src={player.profile_photo_url}
              fallback={`${player.first_name} ${player.last_initial || ""}`}
              size="sm"
            />
          )}
        </div>
      }
    >
      <PageContainer>
        {history && history.length > 0 ? (
          <div className="space-y-3">
            {history.map((card) => {
              const cardDate = parseISO(card.date);
              const status = card.session?.status || "none";
              const taskCount = card.practice_tasks?.length || 0;

              return (
                <AppCard key={card.id}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-muted flex flex-col items-center justify-center">
                      <span className="text-lg font-bold leading-none">
                        {format(cardDate, "d")}
                      </span>
                      <span className="text-[10px] text-text-muted uppercase">
                        {format(cardDate, "EEE")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">
                          {card.title || format(cardDate, "EEEE")}
                        </p>
                        <Tag variant="tier" size="sm">{tierLabels[card.tier]}</Tag>
                      </div>
                      <p className="text-sm text-text-muted">
                        {taskCount} task{taskCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Tag
                      variant={status === "complete" ? "success" : status === "partial" ? "neutral" : "neutral"}
                      size="sm"
                    >
                      {statusIcons[status]}
                      <span className="ml-1">{statusLabels[status]}</span>
                    </Tag>
                  </div>
                </AppCard>
              );
            })}
          </div>
        ) : (
          <AppCard>
            <EmptyState
              icon={Calendar}
              title="No practice history"
              description="Practice cards from the last 7 days will appear here."
            />
          </AppCard>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default PlayerHistory;
