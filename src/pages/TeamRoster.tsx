import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamDashboard } from "@/hooks/useTeamDashboard";
import { DataLoadError } from "@/components/app/DataLoadError";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  UserPlus,
  Search,
  Users,
  Dumbbell,
  ArrowUpRight,
} from "lucide-react";
import { InviteParentsModal } from "@/components/team/InviteParentsModal";
import { AddPlayerChoice } from "@/components/dashboard/AddPlayerChoice";
import { Helmet } from "react-helmet-async";
import {
  RosterPlayerCard,
  type RosterPlayer,
} from "@/components/team/RosterPlayerCard";
import { useRosterActivity } from "@/hooks/useRosterActivity";
import { format } from "date-fns";

interface Membership {
  id: string;
  player_id: string;
  status: string;
  joined_at: string;
  players?: RosterPlayer | null;
}

const getPosition = (player: RosterPlayer) => player.position || "";

const TeamRoster: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { activeView, activePlayerId } = useActiveView();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteModalTab, setInviteModalTab] = useState<"add-child" | "invite">(
    "add-child",
  );
  const [filterText, setFilterText] = useState("");

  // Context-aware back navigation
  const handleBack = () => {
    if (activeView === "coach") {
      navigate(`/teams/${id}`);
    } else if (activePlayerId) {
      navigate(`/players/${activePlayerId}/home`);
    } else {
      navigate("/today");
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const {
    data: dashboard,
    isLoading: teamLoading,
    isError: teamError,
    refetch: retryTeam,
  } = useTeamDashboard(id);
  const team = teamError ? undefined : dashboard?.team;

  // Fetch roster (memberships with player data)
  const {
    data: memberships,
    isLoading,
    isError: rosterError,
    refetch: retryRoster,
  } = useQuery({
    queryKey: ["team-roster", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select(
          `
          id,
          player_id,
          status,
          joined_at,
          players (
            id,
            first_name,
            last_initial,
            birth_year,
            shoots,
            jersey_number,
            profile_photo_url,
            position
          )
        `,
        )
        .eq("team_id", id)
        .eq("status", "active")
        .order("joined_at", { ascending: true });

      if (error) throw error;
      return data as Membership[];
    },
    enabled: !!user && !!id && !!team,
  });

  const activity = useRosterActivity(id, !!team);
  const players = (memberships || []).flatMap((m) =>
    m.players ? [m.players] : [],
  );
  const activityByPlayer = new Map<string, string[]>();
  for (const row of activity.data || []) {
    if (!row.completed_at) continue;
    const dates = activityByPlayer.get(row.player_id);
    if (dates) dates.push(row.completed_at);
    else activityByPlayer.set(row.player_id, [row.completed_at]);
  }
  const normalizedSearch = filterText.trim().toLocaleLowerCase();
  const visiblePlayers = players
    .filter((player) =>
      `${player.first_name} ${player.last_initial || ""} ${player.jersey_number ? `#${player.jersey_number}` : ""} ${getPosition(player)}`
        .toLocaleLowerCase()
        .includes(normalizedSearch),
    )
    .sort(
      (a, b) =>
        a.first_name.localeCompare(b.first_name) ||
        (a.last_initial || "").localeCompare(b.last_initial || ""),
    );
  const activeCount = players.filter((player) =>
    activityByPlayer.has(player.id),
  ).length;
  const workoutCount = players.reduce(
    (total, player) => total + (activityByPlayer.get(player.id)?.length || 0),
    0,
  );
  const activityState = activity.isError
    ? "error"
    : activity.isPending
      ? "loading"
      : "ready";

  // Show loading state while auth or data is loading
  if (isLoading || teamLoading || authLoading) {
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

  if (teamError || rosterError) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <Button
            variant="ghost"
            className="mb-4 min-h-11"
            onClick={() => navigate("/today")}
          >
            Back to my dashboard
          </Button>
          <DataLoadError
            title="Team roster couldn’t load"
            onRetry={() => {
              void retryTeam();
              if (team) void retryRoster();
            }}
          />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      hideNav
      header={
        <div className="flex min-w-0 items-center gap-3 [&_h1]:break-words [&_p]:break-words [&_p]:line-clamp-2">
          <Button
            aria-label="Go back"
            variant="ghost"
            size="icon-sm"
            onClick={handleBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <PageHeader title={t("teams.roster.title")} subtitle={team?.name} />
          </div>
        </div>
      }
    >
      <Helmet>
        <title>Roster | Hockey App</title>
      </Helmet>
      <PageContainer>
        <section
          className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-7"
          aria-label="Your team at a glance"
        >
          <img
            src="/images/email/rink.jpg"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right opacity-20"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/30"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-300">
                Your team
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Your lineup.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Team workouts · Week of {format(activity.weekStart, "MMM d")}.
                Open a card to get to know your player.
              </p>
            </div>
            <Button
              className="shrink-0 gap-2 rounded-xl"
              onClick={() => {
                setInviteModalTab("add-child");
                setShowInviteModal(true);
              }}
            >
              <UserPlus className="h-4 w-4" />
              {t("teams.roster.addPlayer")}
            </Button>
          </div>
          <dl className="relative mt-6 grid grid-cols-3 gap-2">
            {[
              { label: "Players", value: players.length, icon: Users },
              {
                label: "Trained",
                value: activityState === "ready" ? activeCount : "—",
                icon: Users,
              },
              {
                label: "Workouts",
                value: activityState === "ready" ? workoutCount : "—",
                icon: Dumbbell,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="min-w-0 rounded-xl border border-white/10 bg-background/60 p-3"
              >
                <dt className="text-xs text-muted-foreground">
                  <Icon className="mb-2 h-4 w-4" aria-hidden="true" />
                  {label}
                </dt>
                <dd className="mt-1 text-2xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        {activity.isError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <p className="text-sm">
              Progress couldn’t load. Your roster is still available.
            </p>
            <Button variant="outline" onClick={() => void activity.refetch()}>
              Retry progress
            </Button>
          </div>
        )}
        {players.length > 0 ? (
          <section aria-label="Player cards" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative sm:w-80">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  aria-label="Find a player by name, jersey or position"
                  inputMode="search"
                  placeholder="Find a player, number or position"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="min-h-11 rounded-xl pl-9"
                />
              </div>
              <Button
                variant="ghost"
                className="justify-start gap-2 sm:justify-center"
                onClick={() => navigate(`/teams/${id}/progress`)}
              >
                Team progress
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
            <p role="status" className="text-xs text-muted-foreground">
              {normalizedSearch
                ? `${visiblePlayers.length} of ${players.length} players`
                : `${players.length} ${players.length === 1 ? "player" : "players"}`}{" "}
              · Workout days shown Monday–Sunday
            </p>
            {visiblePlayers.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visiblePlayers.map((player) => (
                  <RosterPlayerCard
                    key={player.id}
                    player={player}
                    teamId={id!}
                    weekStart={activity.weekStart}
                    completions={activityByPlayer.get(player.id) || []}
                    activityState={activityState}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                <p className="font-semibold">No players match your search</p>
                <Button variant="ghost" onClick={() => setFilterText("")}>
                  Clear search
                </Button>
              </div>
            )}
          </section>
        ) : (
          <AddPlayerChoice
            onAddMyChild={() => {
              setInviteModalTab("add-child");
              setShowInviteModal(true);
            }}
            onInviteFamilies={() => {
              setInviteModalTab("invite");
              setShowInviteModal(true);
            }}
            className="mt-4"
          />
        )}
      </PageContainer>

      <InviteParentsModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        teamId={id || ""}
        teamName={team?.name || ""}
        initialTab={inviteModalTab}
      />
    </AppShell>
  );
};

export default TeamRoster;
