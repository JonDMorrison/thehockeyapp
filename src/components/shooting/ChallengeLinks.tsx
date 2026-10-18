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
import { Target } from "lucide-react";

export function ChallengeLinks({
  teamId,
  playerId,
  inline = false,
}: {
  teamId?: string;
  playerId?: string;
  inline?: boolean;
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
    enabled: inline && !!first,
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
