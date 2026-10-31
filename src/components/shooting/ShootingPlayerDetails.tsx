import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TeamCheerButton } from "@/components/player/TeamCheerButton";
import { Avatar } from "@/components/app/Avatar";
import { displayShotDate, type ShootingSnapshot } from "@/lib/shooting";

interface Details {
  profile: Record<string, string | null>;
  days: { shot_date: string; shots: number }[];
}
export function ShootingPlayerDetails({
  snapshot,
  playerId,
  viewerId,
  onClose,
}: {
  snapshot: ShootingSnapshot;
  playerId: string;
  viewerId: string;
  onClose: () => void;
}) {
  const player = snapshot.players.find((p) => p.player_id === playerId)!;
  const senders = snapshot.players.filter((p) => p.is_mine && p.active_member);
  const [senderId, setSenderId] = useState(
    senders.length === 1 ? senders[0].player_id : "",
  );
  const details = useQuery({
    queryKey: [
      "shooting-player-details",
      snapshot.challenge.id,
      playerId,
      viewerId,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_shooting_player_details",
        { p_challenge: snapshot.challenge.id, p_player: playerId },
      );
      if (error) throw error;
      return data as unknown as Details;
    },
    staleTime: 0,
  });
  const profile = details.data?.profile;
  const fields = [
    ["Position", "position"],
    ["Shoots", "shoots"],
    ["Favourite NHL team", "fav_nhl_city"],
    ["Favourite player", "fav_nhl_player"],
    ["What I love about hockey", "hockey_love"],
    ["Season goals", "season_goals"],
  ];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {player.first_name} {player.last_initial || ""}
          </DialogTitle>
          <DialogDescription>
            {snapshot.challenge.name} · {snapshot.team_name}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <Avatar
            src={profile?.profile_photo_url}
            fallback={player.first_name}
          />
          <div>
            <p className="font-bold text-2xl">
              {player.total.toLocaleString()} shots
            </p>
            <p className="text-xs text-muted-foreground">
              Counted toward this challenge
            </p>
          </div>
        </div>
        {details.isPending && (
          <p role="status">Loading daily shots and profile…</p>
        )}
        {details.isError && (
          <div role="alert">
            <p>Couldn’t load player details.</p>
            <Button variant="outline" onClick={() => void details.refetch()}>
              Try again
            </Button>
          </div>
        )}
        {details.data && (
          <>
            <section aria-label="Daily shots" className="space-y-3">
              <h3 className="font-semibold">Daily shots</h3>
              <p className="text-xs text-muted-foreground">
                Dates use {snapshot.challenge.timezone}.{" "}
                {snapshot.challenge.daily_cap === 0
                  ? "All logged shots count."
                  : "Shows shots counted toward standings. Extra practice stays private."}
              </p>
              {details.data.days.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Day</th>
                      <th className="text-right py-2">Shots</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.data.days.map((day) => (
                      <tr
                        key={day.shot_date}
                        className="border-b border-border/50"
                      >
                        <td className="py-2">
                          {displayShotDate(day.shot_date)}
                        </td>
                        <td className="text-right tabular-nums">
                          {day.shots.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No shots logged yet.
                </p>
              )}
            </section>
            <section aria-label="Player profile" className="space-y-3">
              <h3 className="font-semibold">Player profile</h3>
              <dl className="space-y-3">
                {fields.map(([label, key]) => (
                  <div key={key}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-sm whitespace-pre-wrap break-words">
                      {profile?.[key] || "Not answered yet"}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        )}
        {player.active_member && senders.length > 0 && (
          <section
            className="border-t pt-4 space-y-3"
            aria-label="Encouragement"
          >
            <h3 className="font-semibold">Encourage your teammate</h3>
            {senders.length > 1 && (
              <label className="block text-sm">
                Send as
                <select
                  aria-label="Send cheer as"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  className="block mt-1 w-full rounded-md border bg-background p-2"
                >
                  <option value="">Choose your player</option>
                  {senders.map((p) => (
                    <option key={p.player_id} value={p.player_id}>
                      {p.first_name} {p.last_initial}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {senderId && senderId !== playerId && (
              <TeamCheerButton
                fromPlayerId={senderId}
                toPlayerId={playerId}
                toPlayerName={player.first_name}
                teamId={snapshot.challenge.team_id}
                variant="full"
              />
            )}
            {senderId === playerId && (
              <p className="text-sm text-muted-foreground">
                Open a teammate’s card to send a thumbs up, star, or encouraging
                message.
              </p>
            )}
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
