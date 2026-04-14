import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
import { Helmet } from "react-helmet-async";

const PAGE_SIZE = 30;

const TeamPractice: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  const tierLabels: Record<string, string> = {
    rec: t("teams.practice.tierRec"),
    rep: t("teams.practice.tierRep"),
    elite: t("teams.practice.tierElite"),
  };

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

  // Fetch practice cards with total count
  const { data: cardsResult, isLoading: cardsLoading } = useQuery({
    queryKey: ["practice-cards", id],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("practice_cards")
        .select(`
          *,
          practice_tasks (id)
        `, { count: "exact" })
        .eq("team_id", id)
        .eq("program_source", "team")
        .order("date", { ascending: false });

      if (error) throw error;
      return { cards: data ?? [], total: count ?? 0 };
    },
    enabled: !!user && !!id,
  });

  const practiceCards = cardsResult?.cards;
  const totalCards = cardsResult?.total ?? 0;
  const visibleCards = practiceCards?.slice(0, visibleCount);

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
              <h1 className="text-lg font-bold truncate">{t("teams.practice.title")}</h1>
              <p className="text-xs text-text-muted">{team?.name}</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/teams/${id}/practice/new?date=${todayStr}`)}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t("teams.practice.new")}
          </Button>
        </div>
      }
    >
      <Helmet><title>Practice | Hockey App</title></Helmet>
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
                <p className="font-semibold">{t("teams.practice.createToday")}</p>
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
                  <p className="font-semibold">{t("teams.practice.todayCard")}</p>
                  <Tag variant={todaysCard.published_at ? "success" : "neutral"} size="sm">
                    {todaysCard.published_at ? t("teams.practice.published") : t("teams.practice.draft")}
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
            {t("teams.practice.allCards")}
            {totalCards > 0 && (
              <span className="ml-1 font-normal text-muted-foreground">({totalCards})</span>
            )}
          </h2>

          {visibleCards && visibleCards.length > 0 ? (
            <div className="space-y-3">
              {visibleCards.map((card) => {
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
                            <Tag variant="neutral" size="sm">{t("teams.practice.draft")}</Tag>
                          )}
                        </div>
                        <p className="text-sm text-text-muted">
                          {taskCount} {taskCount !== 1 ? t("teams.practice.tasks") : t("teams.practice.task")}
                          {card.locked && ` • ${t("teams.practice.locked")}`}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted shrink-0" />
                    </div>
                  </AppCard>
                );
              })}
              {visibleCount < totalCards && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                >
                  {t("common.loadMore")}
                </Button>
              )}
            </div>
          ) : (
            <AppCard>
              <EmptyState
                icon={ClipboardList}
                title={t("teams.practice.emptyTitle")}
                description={t("teams.practice.emptyDescription")}
                action={{
                  label: t("teams.practice.emptyAction"),
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
