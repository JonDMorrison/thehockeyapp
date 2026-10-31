import { useState } from "react";
import { ShootingPlayerDetails } from "./ShootingPlayerDetails";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Shirt, ArrowUpRight, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/app/Avatar";
import { supabase } from "@/integrations/supabase/client";
import type { ShootingSnapshot } from "@/lib/shooting";

/** Standings remain authoritative even if optional player identity cannot load. */
export function ShootingStandings({
  snapshot,
  viewerId,
}: {
  snapshot: ShootingSnapshot;
  viewerId: string;
}) {
  const { players, challenge } = snapshot;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ids = players.map((p) => p.player_id).sort();
  const identities = useQuery({
    queryKey: ["shooting-player-identities", challenge.team_id, viewerId, ids],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const chunks = Array.from(
        { length: Math.ceil(ids.length / 100) },
        (_, i) => ids.slice(i * 100, (i + 1) * 100),
      );
      const rows = await Promise.all(
        chunks.map(async (chunk) => {
          const { data, error } = await supabase
            .from("players")
            .select("id,jersey_number,profile_photo_url")
            .in("id", chunk);
          if (error) throw error;
          return data;
        }),
      );
      return new Map(rows.flat().map((p) => [p.id, p]));
    },
  });
  const leadingTotal = Math.max(1, ...players.map((p) => p.total));
  const mine = players.filter((p) => p.is_mine);
  const rankLabel = (rank: number | null) =>
    rank === null ? "Not ranked yet" : `Rank #${rank}`;
  if (!players.length)
    return (
      <p className="mt-5 text-sm">
        Your challenge is ready. Invite families to get the first shots on the
        board.
      </p>
    );
  return (
    <div className="mt-5 space-y-5">
      {mine.length > 0 && (
        <div
          aria-label="Your player rankings"
          className={`grid gap-3 ${mine.length > 1 ? "sm:grid-cols-2" : ""}`}
        >
          {mine.map((p) => (
            <a
              key={p.player_id}
              href={`#standing-${p.player_id}`}
              className="min-w-0 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 to-transparent p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-rose-300">
                <span>Your player · {p.first_name}</span>
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </div>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                <strong className="text-2xl tabular-nums">
                  {rankLabel(p.rank)}
                </strong>
                <span className="text-sm tabular-nums">
                  {p.total.toLocaleString()} shots
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {p.rank === null
                  ? "Your first shots will put you on the board."
                  : snapshot.status === "Finished"
                    ? "Final result. Your effort made a difference."
                    : "Build the habit. One day at a time!"}
              </p>
            </a>
          ))}
        </div>
      )}
      {identities.isError && (
        <p role="status" className="text-xs text-muted-foreground">
          Photos and jerseys couldn’t load. Standings are up to date.{" "}
          <button
            className="min-h-11 underline"
            onClick={() => void identities.refetch()}
          >
            Retry player details
          </button>
        </p>
      )}
      <ol className="space-y-3">
        {players.map((p) => {
          const identity = identities.data?.get(p.player_id);
          const medal = p.rank !== null && p.rank <= 3;
          return (
            <li
              key={p.player_id}
              id={`standing-${p.player_id}`}
              data-testid={`standing-${p.player_id}`}
              className={`group scroll-mt-24 rounded-2xl border p-3 transition-colors hover:border-primary/40 hover:bg-muted/25 sm:p-4 ${p.is_mine ? "border-primary/50 bg-primary/10 ring-1 ring-primary/10" : "border-border bg-background/40"}`}
            >
              <button
                type="button"
                onClick={() => setSelectedId(p.player_id)}
                aria-label={`View ${p.first_name} ${p.last_initial || ""}: daily shots and profile`}
                className="w-full text-left rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary grid grid-cols-[1.75rem_2.5rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[2.25rem_3rem_minmax(0,1fr)_auto] sm:gap-3"
              >
                <div
                  className={`flex flex-col items-center gap-1 text-sm font-bold tabular-nums ${medal ? (p.rank === 1 ? "text-rose-300" : p.rank === 2 ? "text-slate-300" : "text-zinc-400") : "text-muted-foreground"}`}
                >
                  {medal && <Trophy aria-hidden="true" className="h-4 w-4" />}
                  <span aria-label={rankLabel(p.rank)}>{p.rank ?? "—"}</span>
                </div>
                <Avatar
                  src={identity?.profile_photo_url}
                  alt={`${p.first_name} ${p.last_initial || ""}`}
                  fallback={`${p.first_name} ${p.last_initial || ""}`}
                  className="sm:h-12 sm:w-12"
                />
                <div className="min-w-0">
                  <p className="flex items-start justify-between gap-2 break-words font-semibold">
                    {p.first_name} {p.last_initial || ""}
                    <ChevronRight
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transform-none"
                    />
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    {identity?.jersey_number && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Shirt aria-hidden="true" className="h-3 w-3" />#
                        {identity.jersey_number}
                      </span>
                    )}
                    {p.is_mine && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 font-semibold text-rose-300">
                        Your player
                      </span>
                    )}
                    {!p.active_member && (
                      <span className="text-muted-foreground">
                        Former team member
                      </span>
                    )}
                  </div>
                </div>
                <span className="col-start-3 text-sm font-bold tabular-nums sm:col-auto sm:text-right">
                  {p.total.toLocaleString()} shots
                </span>
                <div
                  className="col-start-3 h-1.5 overflow-hidden rounded-full bg-muted sm:col-end-5"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full rounded-full ${p.is_mine ? "bg-primary" : "bg-slate-400/60"}`}
                    style={{ width: `${(p.total / leadingTotal) * 100}%` }}
                  />
                </div>
                <span className="col-start-3 text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                  View daily shots & profile
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {selectedId && (
        <ShootingPlayerDetails
          key={`${challenge.id}:${selectedId}`}
          snapshot={snapshot}
          playerId={selectedId}
          viewerId={viewerId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
