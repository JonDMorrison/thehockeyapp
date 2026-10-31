import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useLocalCalendarDay } from "@/hooks/useLocalCalendarDay";
import {
  reviewPlayer,
  type ReviewCard,
  type ReviewCompletion,
} from "@/lib/coachTrainingReview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { DataLoadError } from "@/components/app/DataLoadError";
import { toast } from "@/components/app/Toast";

interface Player {
  playerId: string;
  firstName: string;
  lastInitial: string | null;
}
export function CoachTrainingReview({
  teamId,
  userId,
  players,
}: {
  teamId: string;
  userId: string;
  players: Player[];
}) {
  const calendar = useLocalCalendarDay();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string>();
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const today = calendar.split("|")[0];
  const start = startOfWeek(addWeeks(new Date(`${today}T12:00:00`), offset), {
    weekStartsOn: 1,
  });
  const from = format(start, "yyyy-MM-dd");
  const until = format(addDays(start, 7), "yyyy-MM-dd");
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["coach-training-review", teamId, userId, from, today],
    queryFn: async () => {
      const cards: ReviewCard[] = [];
      for (let page = 0; ; page += 100) {
        const result = await supabase
          .from("practice_cards")
          .select("id,date,title,practice_tasks(id,label,is_required)")
          .eq("team_id", teamId)
          .eq("program_source", "team")
          .not("published_at", "is", null)
          .gte("date", from)
          .lt("date", until)
          .lte("date", today)
          .order("date")
          .order("id")
          .range(page, page + 99);
        if (result.error) throw result.error;
        cards.push(...result.data);
        if (result.data.length < 100) break;
      }
      const completions: ReviewCompletion[] = [];
      const sessions: Array<{ player_id: string; practice_card_id: string }> =
        [];
      const ids = cards.flatMap((c) => c.practice_tasks.map((t) => t.id));
      for (let i = 0; i < ids.length; i += 150)
        for (let page = 0; ; page += 500) {
          const r = await supabase
            .from("task_completions")
            .select("player_id,practice_task_id,completed,shots_logged")
            .in("practice_task_id", ids.slice(i, i + 150))
            .order("updated_at", { nullsFirst: true })
            .order("id")
            .range(page, page + 499);
          if (r.error) throw r.error;
          completions.push(...r.data);
          if (r.data.length < 500) break;
        }
      for (let i = 0; i < cards.length; i += 150)
        for (let page = 0; ; page += 500) {
          const r = await supabase
            .from("session_completions")
            .select("player_id,practice_card_id")
            .in(
              "practice_card_id",
              cards.slice(i, i + 150).map((c) => c.id),
            )
            .eq("status", "complete")
            .order("id")
            .range(page, page + 499);
          if (r.error) throw r.error;
          sessions.push(...r.data);
          if (r.data.length < 500) break;
        }
      const members = await supabase
        .from("team_memberships")
        .select("player_id,joined_at")
        .eq("team_id", teamId)
        .eq("status", "active");
      if (members.error) throw members.error;
      return { cards, completions, sessions, members: members.data };
    },
    refetchInterval: 60000,
  });
  const cheer = useMutation({
    mutationFn: async (content: string) => {
      if (!selected || !content.trim() || content.length > 300)
        throw new Error(
          "Choose a player and a message of up to 300 characters.",
        );
      const r = await supabase
        .from("team_cheers")
        .insert({
          team_id: teamId,
          from_user_id: userId,
          to_player_id: selected,
          cheer_type: ["👍", "⭐"].includes(content) ? "emoji" : "message",
          content: content.trim(),
        });
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      setMessage("");
      toast.success("Encouragement sent");
      void client.invalidateQueries({
        predicate: (q) =>
          ["team-cheers", "received-cheers", "team-cheers-coach"].includes(
            String(q.queryKey[0]),
          ),
      });
    },
    onError: (e: Error) =>
      toast.error("Couldn’t send encouragement", e.message),
  });
  const rows = [...players]
    .sort(
      (a, b) =>
        a.firstName.localeCompare(b.firstName) ||
        a.playerId.localeCompare(b.playerId),
    )
    .map((player) => {
      const member = query.data?.members.find(
        (m) => m.player_id === player.playerId,
      );
      const joined = member?.joined_at
        ? format(new Date(member.joined_at), "yyyy-MM-dd")
        : "";
      return {
        ...player,
        ...reviewPlayer(
          query.data?.cards ?? [],
          query.data?.completions ?? [],
          query.data?.sessions ?? [],
          player.playerId,
          joined,
        ),
      };
    });
  const visible = rows.filter(
    (p) =>
      `${p.firstName} ${p.lastInitial ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "active"
          ? p.activeDays > 0
          : p.assigned > 0 && p.activeDays === 0)),
  );
  const player = rows.find((p) => p.playerId === selected);
  const trained = rows.filter((p) => p.activeDays > 0).length;
  return (
    <section
      className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-7"
      aria-label="Coach weekly training review"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Coach review
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            A clear view of the week.
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            aria-label="Previous week"
            onClick={() => setOffset((n) => n - 1)}
          >
            ←
          </Button>
          <span className="text-sm">
            {format(start, "MMM d")}–{format(addDays(start, 6), "MMM d")}
          </span>
          <Button
            variant="outline"
            className="min-h-11"
            aria-label="Next week"
            disabled={offset >= 0}
            onClick={() => setOffset((n) => n + 1)}
          >
            →
          </Button>
        </div>
      </div>
      {query.isLoading ? (
        <p role="status">Loading weekly activity…</p>
      ) : query.isError ? (
        <DataLoadError
          title="Weekly review couldn’t load"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              [trained, "Players trained"],
              [rows.reduce((n, p) => n + p.sessions, 0), "Sessions completed"],
              [rows.reduce((n, p) => n + p.shots, 0), "Workout shots logged"],
              [
                rows.reduce((n, p) => n + p.completed, 0),
                "Exercises checked off",
              ],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-3xl font-semibold tabular-nums">
                  {Number(value).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {trained} of {players.length} players recorded activity. Team
            assignments dated this week through today; shooting challenges and
            personal workouts are separate.
          </p>
          <div className="flex flex-wrap gap-3">
            <Input
              aria-label="Search players"
              placeholder="Find a player"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-11 flex-1"
            />
            <select
              aria-label="Filter training activity"
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Everyone</option>
              <option value="active">Activity recorded</option>
              <option value="quiet">No activity recorded</option>
            </select>
          </div>
          {!query.data?.cards.length && (
            <p className="rounded-xl bg-muted/40 p-4 text-sm">
              No published team workouts due in this period. Rest days and
              future assignments are excluded.
            </p>
          )}
          <div className="divide-y divide-border">
            {visible.map((p) => (
              <button
                key={p.playerId}
                type="button"
                className="flex min-h-20 w-full items-center justify-between gap-4 py-4 text-left"
                onClick={() => {
                  setSelected(p.playerId);
                  setMessage("");
                }}
              >
                <span>
                  <span className="block font-semibold">
                    {p.firstName} {p.lastInitial}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {p.assigned
                      ? `${p.completed}/${p.assigned} exercises · ${p.activeDays} active days`
                      : "No assignments due"}
                  </span>
                </span>
                <span className="text-right text-sm tabular-nums">
                  {p.sessions} sessions
                  <span className="block text-xs text-muted-foreground">
                    {p.shots} workout shots · View →
                  </span>
                </span>
              </button>
            ))}
          </div>
          {!!players.length && !visible.length && (
            <p className="text-sm text-muted-foreground">
              No players match this filter.
            </p>
          )}
          {!players.length && (
            <p className="text-sm text-muted-foreground">
              Invite your roster to start tracking team progress.
            </p>
          )}
          <details className="rounded-xl bg-muted/30 p-4">
            <summary className="min-h-8 cursor-pointer text-sm font-medium">
              Which exercises need a closer look?
            </summary>
            <div className="mt-3 space-y-3">
              {query.data?.cards.flatMap((c) =>
                c.practice_tasks.map((t) => {
                  const eligible = rows.filter((p) =>
                    p.days.some((d) => d.id === c.id),
                  );
                  const done = eligible.filter((p) =>
                    p.days.some((d) =>
                      d.tasks.some((x) => x.id === t.id && x.completed),
                    ),
                  ).length;
                  return (
                    <div
                      key={t.id}
                      className="flex justify-between gap-3 text-sm"
                    >
                      <span>
                        {t.label}
                        <span className="block text-xs text-muted-foreground">
                          {format(new Date(c.date + "T12:00:00"), "EEE, MMM d")}
                          {t.is_required ? " · required" : " · optional"}
                        </span>
                      </span>
                      <span>
                        {done}/{eligible.length} checked off
                      </span>
                    </div>
                  );
                }),
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Checkoffs show recorded activity. Missing records do not prove an
              exercise was skipped.
            </p>
          </details>
        </>
      )}
      <Sheet
        open={!!player}
        onOpenChange={(open) => {
          if (!open) setSelected(undefined);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetTitle>{player?.firstName} · Weekly activity</SheetTitle>
          <SheetDescription>
            {format(start, "MMM d")}–{format(addDays(start, 6), "MMM d")} · Team
            workouts
          </SheetDescription>
          {player && (
            <div className="mt-5 space-y-5">
              <Link
                className="inline-flex min-h-11 items-center font-medium text-primary underline"
                to={`/teams/${teamId}/roster/${player.playerId}`}
              >
                Open profile, goals & answers →
              </Link>
              <section className="space-y-3 rounded-xl border border-border p-4">
                <h3 className="font-medium">Encourage {player.firstName}</h3>
                <div className="flex gap-2">
                  {["👍", "⭐"].map((emoji) => (
                    <Button
                      key={emoji}
                      variant="outline"
                      className="min-h-12 min-w-12 text-xl"
                      disabled={cheer.isPending}
                      aria-label={
                        emoji === "👍" ? "Send thumbs up" : "Send a star"
                      }
                      onClick={() => cheer.mutate(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
                <label className="block text-xs">
                  Encouraging message
                  <Input
                    className="mt-1 min-h-11"
                    maxLength={300}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="I noticed your effort. Keep going!"
                  />
                </label>
                <Button
                  className="min-h-11"
                  disabled={!message.trim() || cheer.isPending}
                  onClick={() => cheer.mutate(message)}
                >
                  Send encouragement
                </Button>
              </section>
              {!player.days.length && (
                <p className="text-sm text-muted-foreground">
                  No assignments due during this period.
                </p>
              )}
              {player.days.map((day) => (
                <section
                  key={day.id}
                  className="rounded-xl border border-border p-4"
                >
                  <h3 className="font-semibold">
                    {format(new Date(day.date + "T12:00:00"), "EEEE, MMM d")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {day.title || "Team workout"} ·{" "}
                    {day.sessionComplete
                      ? "Session complete"
                      : "Session not completed"}{" "}
                    · {day.shots} shots logged
                  </p>
                  <ul className="mt-3 space-y-2">
                    {day.tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <span>{task.label}</span>
                        <span
                          className={
                            task.completed
                              ? "text-success"
                              : "text-muted-foreground"
                          }
                        >
                          {task.completed ? "Complete" : "Not recorded"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
