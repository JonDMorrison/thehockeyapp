import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { SkeletonCard } from "@/components/app/Skeleton";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  ChevronLeft,
  BarChart3,
  Printer,
  CheckCircle,
  Target,
  Flame,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { Helmet } from "react-helmet-async";

interface SeasonReportPlayer {
  player_id: string;
  name: string;
  sessions_completed: number;
  completion_rate: number;
  total_shots: number;
  longest_streak: number;
  badges_earned: number;
}

interface SeasonReport {
  success: boolean;
  error?: string;
  published_cards: number;
  players: SeasonReportPlayer[];
  totals: {
    total_sessions: number;
    total_shots: number;
    avg_completion_rate: number;
  };
}

// Default start = Sept 1 of the current season.
const defaultStartDate = (): string => {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-09-01`;
};

const SeasonReport: React.FC = () => {
  const { t } = useTranslation();
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  const [startDate, setStartDate] = useState<string>(defaultStartDate());
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch team (for name + theme)
  const { data: team } = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, palette_id")
        .eq("id", teamId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!teamId,
  });

  React.useEffect(() => {
    if (team?.palette_id) {
      setTeamTheme(team.palette_id);
    }
  }, [team?.palette_id, setTeamTheme]);

  const {
    data: report,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["season-report", teamId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_season_report", {
        p_team_id: teamId!,
        p_start_date: startDate,
        p_end_date: endDate,
      });
      if (error) throw error;
      return data as unknown as SeasonReport;
    },
    enabled: !!user && !!teamId,
  });

  if (authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const rangeLabel = `${format(new Date(`${startDate}T00:00:00`), "MMM d, yyyy")} – ${format(
    new Date(`${endDate}T00:00:00`),
    "MMM d, yyyy"
  )}`;

  const players = report?.players ?? [];
  const totals = report?.totals;
  const topPerformers = players.slice(0, 3);
  const needNudge = players.filter((p) => p.completion_rate < 30);
  const isEmpty =
    report?.success &&
    (report?.published_cards ?? 0) === 0 &&
    players.every((p) => p.sessions_completed === 0);

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3 no-print">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(`/teams/${teamId}`)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <PageHeader title={t("seasonReport.title")} subtitle={team?.name} />
        </div>
      }
    >
      <Helmet><title>Season Report | Hockey App</title></Helmet>
      <style>{`
        @media print {
          @page { size: letter; margin: 1in; }
          .no-print { display: none !important; }
          html, body { background: #ffffff !important; color: #000000 !important; }
          * { color: #000000 !important; box-shadow: none !important; }
        }
      `}</style>
      <PageContainer>
        {/* Header section */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-team-primary no-print" />
              {t("seasonReport.title")}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {team?.name} · {rangeLabel}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="no-print flex items-center gap-2"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            {t("seasonReport.print")}
          </Button>
        </div>

        {/* Date range picker */}
        <AppCard className="no-print">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted" htmlFor="season-start">
                {t("seasonReport.startDate")}
              </label>
              <input
                id="season-start"
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted" htmlFor="season-end">
                {t("seasonReport.endDate")}
              </label>
              <input
                id="season-end"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              />
            </div>
          </div>
        </AppCard>

        {isLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!isLoading && error && (
          <AppCard>
            <p className="text-center text-destructive py-6">{t("seasonReport.error")}</p>
          </AppCard>
        )}

        {!isLoading && !error && report && !report.success && (
          <AppCard>
            <p className="text-center text-text-muted py-6">
              {t("seasonReport.unauthorized")}
            </p>
          </AppCard>
        )}

        {!isLoading && !error && report?.success && isEmpty && (
          <AppCard>
            <EmptyState
              icon={BarChart3}
              title={t("seasonReport.emptyState")}
              description=""
            />
          </AppCard>
        )}

        {!isLoading && !error && report?.success && !isEmpty && totals && (
          <>
            {/* Team totals */}
            <div className="grid grid-cols-3 gap-3">
              <AppCard className="text-center">
                <div className="w-12 h-12 rounded-full bg-team-primary/10 flex items-center justify-center mx-auto mb-2 no-print">
                  <CheckCircle className="w-6 h-6 text-team-primary" />
                </div>
                <p className="text-2xl font-bold">{totals.total_sessions}</p>
                <p className="text-xs text-text-muted">{t("seasonReport.totalSessions")}</p>
              </AppCard>
              <AppCard className="text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2 no-print">
                  <Target className="w-6 h-6 text-accent" />
                </div>
                <p className="text-2xl font-bold">{totals.total_shots}</p>
                <p className="text-xs text-text-muted">{t("seasonReport.totalShots")}</p>
              </AppCard>
              <AppCard className="text-center">
                <div className="w-12 h-12 rounded-full bg-team-secondary/10 flex items-center justify-center mx-auto mb-2 no-print">
                  <TrendingUp className="w-6 h-6 text-team-secondary" />
                </div>
                <p className="text-2xl font-bold">{totals.avg_completion_rate}%</p>
                <p className="text-xs text-text-muted">{t("seasonReport.avgCompletion")}</p>
              </AppCard>
            </div>

            {/* Top performers */}
            {topPerformers.length > 0 && (
              <div>
                <AppCardTitle className="text-base mb-3">
                  {t("seasonReport.topPerformers")}
                </AppCardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {topPerformers.map((p) => (
                    <AppCard key={p.player_id}>
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      <div className="mt-2 space-y-1 text-sm text-text-muted">
                        <p className="flex items-center justify-between">
                          <span>{t("seasonReport.sessions")}</span>
                          <span className="font-bold text-foreground">{p.sessions_completed}</span>
                        </p>
                        <p className="flex items-center justify-between">
                          <span>{t("seasonReport.shots")}</span>
                          <span className="font-bold text-foreground">{p.total_shots}</span>
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 no-print" />
                            {t("seasonReport.streak")}
                          </span>
                          <span className="font-bold text-foreground">{p.longest_streak}</span>
                        </p>
                      </div>
                    </AppCard>
                  ))}
                </div>
              </div>
            )}

            {/* Full roster table */}
            <AppCard>
              <AppCardTitle className="text-base mb-3">
                {t("seasonReport.rosterTitle")}
              </AppCardTitle>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("seasonReport.colName")}</TableHead>
                    <TableHead className="text-right">{t("seasonReport.colSessions")}</TableHead>
                    <TableHead className="text-right">{t("seasonReport.colCompletion")}</TableHead>
                    <TableHead className="text-right">{t("seasonReport.colShots")}</TableHead>
                    <TableHead className="text-right">{t("seasonReport.colStreak")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((p) => (
                    <TableRow key={p.player_id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{p.sessions_completed}</TableCell>
                      <TableCell className="text-right">{p.completion_rate}%</TableCell>
                      <TableCell className="text-right">{p.total_shots}</TableCell>
                      <TableCell className="text-right">{p.longest_streak}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AppCard>

            {/* Players who may need a nudge */}
            {needNudge.length > 0 && (
              <AppCard variant="muted">
                <AppCardTitle className="text-base mb-1 text-text-muted">
                  {t("seasonReport.nudgeTitle")}
                </AppCardTitle>
                <p className="text-xs text-text-muted mb-3">
                  {t("seasonReport.nudgeDescription")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {needNudge.map((p) => (
                    <span
                      key={p.player_id}
                      className="text-sm text-text-muted rounded-full bg-surface-card px-3 py-1"
                    >
                      {p.name} · {p.completion_rate}%
                    </span>
                  ))}
                </div>
              </AppCard>
            )}
          </>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default SeasonReport;
