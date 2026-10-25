import { Link } from "react-router-dom";
import { addDays, format } from "date-fns";
import { ArrowUpRight, Check, Dumbbell, Shirt } from "lucide-react";
import { Avatar } from "@/components/app/Avatar";
import { getPlayerPositionLabel } from "@/lib/playerProfile";

export interface RosterPlayer {
  id: string;
  first_name: string;
  last_initial: string | null;
  birth_year: number | null;
  shoots: string | null;
  jersey_number: string | null;
  profile_photo_url: string | null;
  position: string | null;
}

export function RosterPlayerCard({
  player,
  teamId,
  weekStart,
  completions,
  activityState,
}: {
  player: RosterPlayer;
  teamId: string;
  weekStart: Date;
  completions: string[];
  activityState: "loading" | "error" | "ready";
}) {
  const name = `${player.first_name}${player.last_initial ? ` ${player.last_initial}.` : ""}`;
  const days = new Set(
    completions.map((date) => format(new Date(date), "yyyy-MM-dd")),
  );
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40">
      <div
        aria-hidden="true"
        className="h-16 bg-[linear-gradient(110deg,hsl(var(--primary)/0.12),transparent_65%)]"
      >
        <div className="absolute -right-1 -top-2 select-none text-7xl font-black leading-none text-white/[0.05]">
          {player.jersey_number || <Shirt className="m-4 h-12 w-12" />}
        </div>
      </div>
      <div className="relative px-4 pb-4">
        <div className="-mt-9 mb-3 flex items-end justify-between gap-2">
          <Avatar
            src={player.profile_photo_url}
            alt={name}
            fallback={`${player.first_name} ${player.last_initial || ""}`}
            size="xl"
            className="h-20 w-20 border-4 border-card text-2xl [&>div]:from-slate-600 [&>div]:to-slate-800"
          />
          {player.jersey_number && (
            <span className="max-w-[50%] break-all rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-sm font-bold text-rose-300">
              #{player.jersey_number}
            </span>
          )}
        </div>
        <h2 className="break-words text-xl font-bold tracking-tight">
          <Link
            to={`/teams/${teamId}/roster/${player.id}`}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            aria-label={`View ${name}'s player profile`}
          >
            {name}
            <ArrowUpRight
              className="ml-1 inline h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </Link>
        </h2>
        <p className="mt-1 min-h-5 break-words text-xs text-muted-foreground">
          {[
            getPlayerPositionLabel(player.position),
            player.shoots === "left"
              ? "Shoots left"
              : player.shoots === "right"
                ? "Shoots right"
                : null,
            player.birth_year ? `Born ${player.birth_year}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p
          aria-hidden="true"
          className="mt-3 flex min-h-8 items-center gap-1 text-sm font-semibold text-primary"
        >
          View player profile <ArrowUpRight className="h-4 w-4" />
        </p>
        <div className="mt-4 border-t border-border/70 pt-3">
          {activityState === "ready" ? (
            <>
              <p className="flex items-center gap-1.5 text-sm">
                <Dumbbell
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <strong>{completions.length}</strong>{" "}
                {completions.length === 1 ? "workout" : "workouts"} this week
              </p>
              <div
                className="mt-3 grid grid-cols-7 gap-1"
                role="img"
                aria-label={`Workout days this week: ${Array.from(
                  { length: 7 },
                  (_, i) => {
                    const day = addDays(weekStart, i);
                    return `${format(day, "EEEE")}: ${days.has(format(day, "yyyy-MM-dd")) ? "workout logged" : "no workout logged"}`;
                  },
                ).join("; ")}`}
              >
                {Array.from({ length: 7 }, (_, i) => {
                  const day = addDays(weekStart, i),
                    active = days.has(format(day, "yyyy-MM-dd"));
                  return (
                    <div key={i} aria-hidden="true" className="text-center">
                      <span
                        className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full border ${active ? "border-success/30 bg-success/15 text-success" : "border-border bg-background/50 text-muted-foreground"}`}
                      >
                        {active ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                        )}
                      </span>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {format(day, "EEEEE")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="py-4 text-sm text-muted-foreground" role="status">
              {activityState === "loading"
                ? "Loading progress…"
                : "Progress unavailable"}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
