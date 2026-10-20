import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle, Target, ArrowUpRight } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import {
  shootingList,
  shootingSnapshot,
  displayShotDate,
} from "@/lib/shooting";
import { DataLoadError } from "@/components/app/DataLoadError";
import { Avatar } from "@/components/app/Avatar";
import { ProgressBar } from "@/components/app/ProgressBar";

export function TeamProgressOverview({
  teamId,
  userId,
  players,
}: {
  teamId: string;
  userId: string;
  players: Array<{
    playerId: string;
    firstName: string;
    lastInitial: string | null;
    profilePhotoUrl: string | null;
    thisWeekSessions: number;
  }>;
}) {
  const [chosen, setChosen] = useState("");
  const list = useQuery({
    queryKey: ["progress-challenges", teamId, userId],
    queryFn: () => shootingList(teamId),
    refetchInterval: 60000,
  });
  const challenges = list.data || [];
  const selected =
    challenges.find((c) => c.id === chosen) ||
    challenges.find((c) => c.status === "Live") ||
    challenges.find((c) => c.status === "Scheduled") ||
    challenges[0];
  const snapshot = useQuery({
    queryKey: ["progress-shooting", teamId, userId, selected?.id],
    queryFn: () => shootingSnapshot(selected!.id),
    enabled: !!selected && !list.isError,
    refetchInterval: 60000,
  });
  const data = snapshot.data;
  const total = players.reduce((n, p) => n + p.thisWeekSessions, 0);
  const active = players.filter((p) => p.thisWeekSessions > 0).length;
  const shots = data?.players.reduce((n, p) => n + p.total, 0) || 0;
  const shooters = data?.players.filter((p) => p.total > 0).length || 0;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section
        aria-labelledby="workout-progress-heading"
        className="rounded-3xl border border-border bg-surface-card p-5 sm:p-7"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-primary/10 p-3 text-rose-300">
            <CheckCircle aria-hidden="true" />
          </span>
          <div>
            <h2 id="workout-progress-heading" className="text-xl font-bold">
              Workouts this week
            </h2>
            <p className="text-sm text-text-muted">
              {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d")}–
              {format(endOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d")}
            </p>
          </div>
        </div>
        <div className="my-6 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-5xl font-bold tabular-nums">{total}</p>
            <p className="text-sm text-text-muted">workouts completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {active}
              <span className="text-base font-normal text-text-muted">
                {" "}
                / {players.length}
              </span>
            </p>
            <p className="text-sm text-text-muted">players trained</p>
          </div>
        </div>
        <ProgressBar
          value={active}
          max={Math.max(players.length, 1)}
          aria-label="Players who trained this week"
        />
        <p className="mt-2 text-xs text-text-muted">
          Participation, not a workout target. Team workouts only.
        </p>
        <div className="mt-5 space-y-3">
          {[...players]
            .sort(
              (a, b) =>
                b.thisWeekSessions - a.thisWeekSessions ||
                a.firstName.localeCompare(b.firstName),
            )
            .slice(0, 5)
            .map((p) => (
              <Link
                key={p.playerId}
                to={`/teams/${teamId}/roster/${p.playerId}`}
                className="flex min-h-12 items-center gap-3 rounded-xl p-2 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Avatar
                  src={p.profilePhotoUrl}
                  fallback={`${p.firstName} ${p.lastInitial || ""}`}
                  size="sm"
                />
                <span className="min-w-0 flex-1 break-words text-sm font-medium">
                  {p.firstName} {p.lastInitial}
                </span>
                <span className="shrink-0 text-sm tabular-nums">
                  {p.thisWeekSessions} workouts
                </span>
              </Link>
            ))}
        </div>
        {!players.length && (
          <p className="mt-5 text-text-muted">
            Invite your roster to get the team moving.
          </p>
        )}
        {!!players.length && !total && (
          <p className="mt-4 text-sm text-text-muted">
            A fresh week. Completed workouts will appear here.
          </p>
        )}
      </section>
      <section
        aria-labelledby="shooting-progress-heading"
        className="relative overflow-hidden rounded-3xl border border-border bg-surface-card p-5 sm:p-7"
      >
        <Target
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 text-primary/5"
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-primary/10 p-3 text-rose-300">
              <Target aria-hidden="true" />
            </span>
            <h2 id="shooting-progress-heading" className="text-xl font-bold">
              Shooting challenge
            </h2>
          </div>
          {list.isError ? (
            <DataLoadError
              title="Challenges couldn’t load"
              onRetry={() => {
                void list.refetch();
              }}
            />
          ) : list.isLoading ? (
            <p className="mt-6" role="status">
              Loading challenges…
            </p>
          ) : !selected ? (
            <div className="py-8">
              <p className="text-2xl font-bold">Every shot adds up.</p>
              <p className="mt-2 text-text-muted">
                Pick dates, invite the team, and watch the shots stack up.
              </p>
              <Link
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-rose-300 underline"
                to={`/teams/${teamId}/shooting/new`}
              >
                Start a shooting challenge <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <label
                className="mt-5 block text-xs text-text-muted"
                htmlFor="progress-challenge"
              >
                Choose challenge
              </label>
              <select
                id="progress-challenge"
                className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-border bg-background p-3 text-sm"
                value={selected.id}
                onChange={(e) => setChosen(e.target.value)}
              >
                {challenges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {snapshot.isError ? (
                <DataLoadError
                  title="Shot totals couldn’t load"
                  onRetry={() => {
                    void snapshot.refetch();
                  }}
                />
              ) : snapshot.isLoading || !data ? (
                <p className="mt-5" role="status">
                  Loading shot totals…
                </p>
              ) : (
                <>
                  <p className="mt-3 text-sm text-text-muted">
                    {data.status} · {displayShotDate(data.challenge.start_date)}{" "}
                    – {displayShotDate(data.challenge.end_date)} ·{" "}
                    {data.challenge.timezone}
                  </p>
                  <div className="my-5">
                    <p className="text-5xl font-bold tabular-nums">
                      {shots.toLocaleString()}
                    </p>
                    <p className="text-sm text-text-muted">
                      shots logged · {shooters} players participating
                    </p>
                  </div>
                  <p className="mb-3 text-xs text-text-muted">
                    Challenge totals · bars compare shots, not a target
                  </p>
                  <div className="space-y-3">
                    {[...data.players]
                      .sort(
                        (a, b) =>
                          b.total - a.total ||
                          a.first_name.localeCompare(b.first_name),
                      )
                      .slice(0, 5)
                      .map((p) => (
                        <div key={p.player_id}>
                          <div className="mb-1 flex justify-between gap-3 text-sm">
                            <span className="min-w-0 break-words">
                              {p.rank ? `#${p.rank} · ` : ""}
                              {p.first_name} {p.last_initial}
                              {!p.active_member ? " · former player" : ""}
                            </span>
                            <span className="shrink-0 tabular-nums">
                              {p.total.toLocaleString()} shots
                            </span>
                          </div>
                          <ProgressBar
                            value={p.total}
                            max={Math.max(
                              1,
                              ...data.players.map((p) => p.total),
                            )}
                            aria-label={`${p.first_name} shots compared with challenge leader`}
                          />
                        </div>
                      ))}
                  </div>
                  {!shots && (
                    <p className="mt-4 text-sm text-text-muted">
                      {data.status === "Scheduled"
                        ? "Ready for the first puck drop. Logging opens on the start date."
                        : "No shots logged yet."}
                    </p>
                  )}
                  <Link
                    to={`/shooting/${selected.id}`}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 text-rose-300 underline"
                  >
                    View full challenge <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
