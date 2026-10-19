import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  shootingList,
  shootingSnapshot,
  displayShotDate,
} from "@/lib/shooting";
import { ShootingEntry } from "./ShootingEntry";
import { Button } from "@/components/ui/button";
import { AppCard } from "@/components/app/AppCard";
import { ArrowUpRight, Plus, Target } from "lucide-react";

export function ChallengeLinks({
  teamId,
  playerId,
  inline = false,
  coachOverview = false,
}: {
  teamId?: string;
  playerId?: string;
  inline?: boolean;
  coachOverview?: boolean;
}) {
  const { user } = useAuth();
  const list = useQuery({
    queryKey: ["shooting-list", teamId, playerId, user?.id],
    enabled: !!user && (!!teamId || !!playerId),
    queryFn: () => shootingList(teamId, playerId),
    refetchInterval: 15000,
  });
  const first = list.data?.find((c) => c.status === "Live") || list.data?.[0];
  const snapshot = useQuery({
    queryKey: ["shooting-snapshot", first?.id, user?.id],
    enabled: (inline || coachOverview) && !!first,
    queryFn: () => shootingSnapshot(first!.id),
    refetchInterval: 10000,
  });
  if (list.isPending)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading shooting challenges…
      </p>
    );
  if (list.isError)
    return (
      <AppCard>
        <p role="alert">Couldn’t load shooting challenges.</p>
        <Button variant="outline" onClick={() => list.refetch()}>
          Retry challenges
        </Button>
      </AppCard>
    );
  if (!first && playerId) return null;
  const mine = snapshot.data?.players.find(
    (p) => p.player_id === playerId && p.is_mine && p.active_member,
  );
  if (coachOverview) {
    const shots =
      snapshot.data?.players.reduce((sum, p) => sum + p.total, 0) ?? 0;
    const participating =
      snapshot.data?.players.filter((p) => p.total > 0).length ?? 0;
    const daysBetween = (a: string, b: string) =>
      Math.floor(
        (Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) /
          86400000,
      );
    const duration = first
      ? daysBetween(first.start_date, first.end_date) + 1
      : 0;
    const elapsed =
      first && snapshot.data
        ? Math.max(
            0,
            Math.min(
              duration,
              daysBetween(first.start_date, snapshot.data.today) + 1,
            ),
          )
        : 0;
    return (
      <section
        aria-label="Team shooting challenge"
        className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <Target
          aria-hidden="true"
          className="pointer-events-none absolute -right-7 -top-7 h-44 w-44 text-primary opacity-[0.07]"
          strokeWidth={0.7}
        />
        <div className="relative flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            <Target className="h-4 w-4 text-primary" />
            Shooting challenge
          </p>
          {first && (
            <Link
              aria-label="Start another shooting challenge"
              to={`/teams/${teamId}/shooting/new`}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </Link>
          )}
        </div>
        {first ? (
          <>
            <div className="relative mt-5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${first.status === "Live" ? "bg-success/10 text-success" : "bg-white/[0.06] text-muted-foreground"}`}
              >
                {first.status === "Live" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                )}
                {first.status}
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold leading-tight">
                {first.name}
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">
                {displayShotDate(first.start_date)} –{" "}
                {displayShotDate(first.end_date)}
              </p>
            </div>
            {snapshot.isError ? (
              <div role="alert" className="my-5 text-sm">
                <p>Challenge totals couldn’t load.</p>
                <Button
                  className="mt-2"
                  variant="outline"
                  onClick={() => void snapshot.refetch()}
                >
                  Retry challenge totals
                </Button>
              </div>
            ) : snapshot.isPending ? (
              <p role="status" className="my-6 text-sm text-muted-foreground">
                Loading challenge totals…
              </p>
            ) : (
              <div className="my-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="font-display text-4xl font-bold tabular-nums">
                    {shots.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Shots logged
                  </p>
                </div>
                <div className="border-l border-border pl-5">
                  <p className="font-display text-4xl font-bold tabular-nums">
                    {participating.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Players logging shots
                  </p>
                </div>
              </div>
            )}
            {snapshot.data && !snapshot.isError && (
              <div className="mb-5">
                <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {first.status === "Scheduled"
                      ? "Starts soon"
                      : first.status === "Finished"
                        ? "Challenge complete"
                        : `Day ${elapsed} of ${duration}`}
                  </span>
                  <span>{duration} days</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{
                      width: `${duration ? (elapsed / duration) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <Button
              asChild
              variant="outline"
              className="mt-auto min-h-11 self-start"
            >
              <Link to={`/shooting/${first.id}`}>
                View challenge
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {(list.data?.length ?? 0) > 1 && (
              <details className="mt-4 border-t border-border pt-3">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Other challenges ({list.data!.length - 1})
                </summary>
                <div className="mt-2 space-y-1">
                  {list
                    .data!.filter((c) => c.id !== first.id)
                    .map((c) => (
                      <Link
                        key={c.id}
                        className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-2 text-sm hover:bg-muted"
                        to={`/shooting/${c.id}`}
                      >
                        <span>{c.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.status}
                        </span>
                      </Link>
                    ))}
                </div>
              </details>
            )}
          </>
        ) : (
          <div className="relative flex flex-1 flex-col items-start">
            <div className="my-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.06]">
              <Target className="h-8 w-8 text-primary" strokeWidth={1.3} />
            </div>
            <h2 className="font-display text-2xl font-bold">
              Give your team a goal
            </h2>
            <p className="mb-6 mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Choose the dates. Families log shots. Watch your team’s effort add
              up.
            </p>
            <Button asChild variant="outline" className="mt-auto min-h-11">
              <Link to={`/teams/${teamId}/shooting/new`}>
                Start a shooting challenge
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </section>
    );
  }
  return (
    <AppCard className="my-5 space-y-4 border-primary/25">
      <div className="flex items-center gap-2">
        <Target aria-hidden="true" className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Shooting challenges</h2>
      </div>
      {!playerId && (
        <Button asChild className="min-h-11">
          <Link to={`/teams/${teamId}/shooting/new`}>
            Start a shooting challenge
          </Link>
        </Button>
      )}
      {inline && snapshot.isError && (
        <p role="alert">
          Couldn’t load the shot entry. Open the challenge to retry.
        </p>
      )}
      {inline && snapshot.data && mine && snapshot.data.status === "Live" && (
        <ShootingEntry
          key={`${first.id}:${mine.player_id}:${snapshot.data.today}`}
          viewerId={user!.id}
          snapshot={snapshot.data}
          player={mine}
          date={snapshot.data.today}
        />
      )}
      {list.data?.map((c) => (
        <Link
          className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted"
          key={c.id}
          to={`/shooting/${c.id}${playerId ? `?player=${playerId}` : ""}`}
        >
          <span>
            <strong className="block text-sm">{c.name}</strong>
            <span className="text-xs text-muted-foreground">
              {displayShotDate(c.start_date)} – {displayShotDate(c.end_date)}
            </span>
          </span>
          <span className="text-xs font-bold">{c.status} →</span>
        </Link>
      ))}
    </AppCard>
  );
}
