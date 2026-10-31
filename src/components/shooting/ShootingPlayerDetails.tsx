import {
  CalendarDays,
  Heart,
  Target,
  Trophy,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getPlayerPositionLabel } from "@/lib/playerProfile";
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
    ["Favourite NHL team", "fav_nhl_city"],
    ["Favourite player", "fav_nhl_player"],
  ];
  const days = details.data?.days.filter((day) => day.shots > 0) || [];
  const dailyAverage = days.length
    ? Math.round(days.reduce((sum, day) => sum + day.shots, 0) / days.length)
    : 0;
  const peak = Math.max(1, ...days.map((day) => day.shots));
  const name = `${player.first_name} ${player.last_initial || ""}`.trim();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document
            .getElementById(`standing-${playerId}`)
            ?.querySelector("button")
            ?.focus();
        }}
        className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-3xl sm:rounded-3xl border-border/80 bg-background p-0 shadow-2xl sm:w-full [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:bg-muted/70 [&>button]:p-2 [&>button]:h-11 [&>button]:w-11 [&>button]:grid [&>button]:place-items-center"
      >
        <div className="shrink-0 border-b border-border/70 bg-gradient-to-br from-primary/10 via-surface to-surface px-5 pb-5 pt-7 sm:px-7">
          <DialogHeader className="text-left">
            <div className="mb-5 flex items-center gap-2 pr-10 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Your
              team · Player details
            </div>
            <div className="flex items-center gap-4">
              <Avatar
                src={profile?.profile_photo_url}
                fallback={name}
                alt={name}
                size="xl"
                className="ring-4 ring-background/60 sm:h-20 sm:w-20 sm:text-2xl"
              />
              <div className="min-w-0">
                <DialogTitle className="break-words font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {name}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm">
                  {snapshot.team_name}
                </DialogDescription>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {player.rank !== null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 font-medium">
                      <Trophy
                        className="h-3 w-3 text-primary"
                        aria-hidden="true"
                      />
                      Rank #{player.rank}
                    </span>
                  )}
                  {profile?.position && (
                    <span className="text-muted-foreground">
                      {getPlayerPositionLabel(profile.position) ||
                        profile.position}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-6 grid grid-cols-3 divide-x divide-border/70 rounded-2xl border border-border/70 bg-background/60 py-4">
            {[
              [player.total.toLocaleString(), "Challenge shots"],
              [
                details.data ? days.length.toLocaleString() : "—",
                "Practice days",
              ],
              [
                details.data ? dailyAverage.toLocaleString() : "—",
                "Avg. / practice day",
              ],
            ].map(([value, label]) => (
              <div key={label} className="min-w-0 px-2 text-center sm:px-4">
                <p className="font-display text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
                  {value}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-muted-foreground sm:text-xs">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {details.isPending && (
            <div role="status" className="space-y-4 py-3">
              <p className="text-sm text-muted-foreground">
                Loading daily shots and profile…
              </p>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-muted/60 motion-reduce:animate-none"
                />
              ))}
            </div>
          )}
          {details.isError && (
            <div
              role="alert"
              className="rounded-2xl border border-border bg-muted/30 p-5"
            >
              <p className="font-medium">Couldn’t load player details.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your place in the standings is saved. Try again when you’re
                connected.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => void details.refetch()}
              >
                Try again
              </Button>
            </div>
          )}
          {details.data && (
            <Tabs defaultValue="activity" className="w-full">
              <TabsList
                aria-label="Player details"
                className="mb-5 grid h-11 w-full grid-cols-2 rounded-xl bg-muted/50 p-1"
              >
                <TabsTrigger
                  value="activity"
                  className="h-9 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  <CalendarDays className="mr-2 h-4 w-4" aria-hidden="true" />
                  Daily shots
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="h-9 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  Player profile
                  <ChevronRight
                    className="ml-2 h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                </TabsTrigger>
              </TabsList>
              <TabsContent value="activity" className="mt-0 space-y-4">
                <div>
                  <h3 className="font-semibold">{snapshot.challenge.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Daily shots counted toward this challenge. Dates use{" "}
                    {snapshot.challenge.timezone}.
                  </p>
                </div>
                {days.length ? (
                  <div className="overflow-hidden rounded-2xl border border-border/70">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/35">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                            Day
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                            Shots
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {days.map((day) => (
                          <tr
                            key={day.shot_date}
                            className="border-t border-border/50"
                          >
                            <td className="px-4 py-3.5">
                              <span className="text-sm">
                                {displayShotDate(day.shot_date)}
                              </span>
                              <div
                                className="mt-2 h-1 w-full max-w-48 overflow-hidden rounded-full bg-muted"
                                aria-hidden="true"
                              >
                                <div
                                  className="h-full rounded-full bg-primary/80"
                                  style={{
                                    width: `${(day.shots / peak) * 100}%`,
                                  }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right text-base font-semibold tabular-nums">
                              {day.shots.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-7 text-center">
                    <Target
                      className="mx-auto mb-3 h-7 w-7 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <p className="font-medium">No shots logged yet.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Every great habit starts with one practice.
                    </p>
                  </div>
                )}
                <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                  <ShieldCheck
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {snapshot.challenge.daily_cap === 0
                    ? "All logged shots count. Only visible inside your team."
                    : `Up to ${(snapshot.challenge.daily_cap ?? 300).toLocaleString()} shots per day count. Extra practice stays private.`}
                </p>
              </TabsContent>
              <TabsContent value="profile" className="mt-0 space-y-4">
                <div>
                  <h3 className="font-semibold">Meet {player.first_name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The person behind the practice.
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-3">
                  {[
                    ["Position", getPlayerPositionLabel(profile?.position)],
                    [
                      "Shoots",
                      profile?.shoots === "left"
                        ? "Left"
                        : profile?.shoots === "right"
                          ? "Right"
                          : null,
                    ],
                    ...fields.map(([label, key]) => [label, profile?.[key]]),
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 p-4"
                    >
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-2 break-words text-sm font-semibold">
                        {value || "Not answered yet"}
                      </dd>
                    </div>
                  ))}
                </dl>
                {[
                  {
                    label: "What I love about hockey",
                    key: "hockey_love",
                    Icon: Heart,
                  },
                  { label: "Season goals", key: "season_goals", Icon: Target },
                ].map(({ label, key, Icon: Mark }) => {
                  return (
                    <div
                      key={key}
                      className="rounded-2xl border border-border/70 bg-muted/20 p-5"
                    >
                      <h4 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Mark
                          className="h-4 w-4 text-primary"
                          aria-hidden="true"
                        />
                        {label}
                      </h4>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                        {profile?.[key] || "Not answered yet"}
                      </p>
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>
          )}
        </div>
        {player.active_member && senders.length > 0 && (
          <section
            className="shrink-0 border-t border-border/70 bg-surface px-5 py-4 sm:px-7 space-y-3"
            aria-label="Encouragement"
          >
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Encourage your teammate</h3>
            </div>
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
