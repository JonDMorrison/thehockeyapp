import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { format, isToday, isFuture, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  ClipboardList,
  Check,
} from "lucide-react";

const tierLabels: Record<string, string> = {
  rec: "Rec",
  rep: "Rep",
  elite: "Elite",
};

const TeamPractice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch team
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch practice cards
  const { data: practiceCards, isLoading: cardsLoading } = useQuery({
    queryKey: ["practice-cards", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_cards")
        .select(`
          *,
          practice_tasks (id)
        `)
        .eq("team_id", id)
        .order("date", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  useEffect(() => {
    if (team?.palette_id) {
      setTeamTheme(team.palette_id);
    }
  }, [team?.palette_id, setTeamTheme]);

  const isLoading = teamLoading || cardsLoading || authLoading;

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

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todaysCard = practiceCards?.find((c) => c.date === todayStr);

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(`/teams/${id}`)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Avatar
              src={team?.team_logo_url || team?.team_photo_url}
              fallback={team?.name || "T"}
              size="sm"
            />
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">Practice Cards</h1>
              <p className="text-xs text-text-muted">{team?.name}</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/teams/${id}/practice/new?date=${todayStr}`)}
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
      }
    >
      <PageContainer>
        {/* Today's Card Quick Action */}
        {!todaysCard ? (
          <AppCard
            className="border-dashed border-2 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => navigate(`/teams/${id}/practice/new?date=${todayStr}`)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-team-primary/10 flex items-center justify-center">
                <Plus className="w-6 h-6 text-team-primary" />
              </div>
              <div>
                <p className="font-semibold">Create Today's Card</p>
                <p className="text-sm text-text-muted">
                  {format(new Date(), "EEEE, MMM d")}
                </p>
              </div>
            </div>
          </AppCard>
        ) : (
          <AppCard
            className="cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => navigate(`/teams/${id}/practice/${todaysCard.id}/edit`)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-team-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-team-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Today's Card</p>
                  <Tag variant={todaysCard.published_at ? "success" : "neutral"} size="sm">
                    {todaysCard.published_at ? "Published" : "Draft"}
                  </Tag>
                </div>
                <p className="text-sm text-text-muted">
                  {todaysCard.title || format(parseISO(todaysCard.date), "EEEE, MMM d")} • {tierLabels[todaysCard.tier]}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted shrink-0" />
            </div>
          </AppCard>
        )}

        {/* All Practice Cards */}
        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">
            All Practice Cards
          </h2>

          {practiceCards && practiceCards.length > 0 ? (
            <div className="space-y-3">
              {practiceCards.map((card) => {
                const cardDate = parseISO(card.date);
                const taskCount = card.practice_tasks?.length || 0;

                return (
                  <AppCard
                    key={card.id}
                    className="cursor-pointer hover:shadow-medium transition-shadow"
                    onClick={() => navigate(`/teams/${id}/practice/${card.id}/edit`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center">
                        <span className="text-lg font-bold leading-none">
                          {format(cardDate, "d")}
                        </span>
                        <span className="text-[10px] text-text-muted uppercase">
                          {format(cardDate, "MMM")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">
                            {card.title || format(cardDate, "EEEE")}
                          </p>
                          <Tag variant="tier" size="sm">{tierLabels[card.tier]}</Tag>
                          {card.published_at ? (
                            <Tag variant="success" size="sm">
                              <Check className="w-3 h-3" />
                            </Tag>
                          ) : (
                            <Tag variant="neutral" size="sm">Draft</Tag>
                          )}
                        </div>
                        <p className="text-sm text-text-muted">
                          {taskCount} task{taskCount !== 1 ? "s" : ""}
                          {card.locked && " • Locked"}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted shrink-0" />
                    </div>
                  </AppCard>
                );
              })}
            </div>
          ) : (
            <AppCard>
              <EmptyState
                icon={ClipboardList}
                title="No practice cards yet"
                description="Create your first practice card to start assigning workouts."
                action={{
                  label: "Create Card",
                  onClick: () => navigate(`/teams/${id}/practice/new?date=${todayStr}`),
                }}
              />
            </AppCard>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default TeamPractice;
