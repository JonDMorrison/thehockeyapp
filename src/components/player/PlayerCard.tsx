import type { ReactNode } from "react";
import {
  CalendarDays,
  Heart,
  MapPin,
  Shirt,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/app/Avatar";
import { getPlayerPositionLabel } from "@/lib/playerProfile";

interface PlayerIdentity {
  first_name: string;
  last_initial?: string | null;
  profile_photo_url?: string | null;
  birth_year?: number | null;
  jersey_number?: string | null;
  shoots?: string | null;
  position?: string | null;
}

/** Decorative rink imagery never substitutes for the family's own player photo. */
export function PlayerCard({
  player,
  teamName,
  photoAction,
  action,
}: {
  player: PlayerIdentity;
  teamName?: string;
  photoAction?: ReactNode;
  action?: ReactNode;
}) {
  const { t } = useTranslation();
  const name = `${player.first_name}${player.last_initial ? ` ${player.last_initial}.` : ""}`;
  const facts = [
    player.birth_year && {
      icon: CalendarDays,
      label: t("players.new.birthYearLabel", "Birth year"),
      value: String(player.birth_year),
    },
    player.shoots &&
      player.shoots !== "unknown" && {
        icon: Target,
        label: t("players.new.shootsLabel"),
        value:
          player.shoots === "left"
            ? t("teams.addChild.shootsLeft")
            : t("teams.addChild.shootsRight"),
      },
    getPlayerPositionLabel(player.position) && {
      icon: Shirt,
      label: t("players.profile.positionLabel", "Position"),
      value: getPlayerPositionLabel(player.position),
    },
  ].filter(
    (fact): fact is { icon: typeof Target; label: string; value: string } =>
      Boolean(fact),
  );

  return (
    <section
      aria-label={`${name} player card`}
      className="relative isolate overflow-hidden rounded-3xl border border-border bg-card"
    >
      <div className="relative h-32 sm:h-44 bg-slate-900" aria-hidden="true">
        <img
          src="/images/email/rink.jpg"
          alt=""
          className="h-full w-full object-cover object-[65%_48%] opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white sm:left-7">
          <Shirt className="h-3.5 w-3.5" />{" "}
          {t("players.profile.playerCard", "Player card")}
        </div>
      </div>
      {player.jersey_number && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-16 select-none text-[100px] font-black leading-none tracking-tighter text-white/[0.07] sm:right-8 sm:top-20 sm:text-[150px]"
        >
          {player.jersey_number}
        </span>
      )}
      <div className="relative px-5 pb-5 sm:px-7 sm:pb-7">
        <div className="-mt-10 mb-4 flex items-end justify-between gap-3 sm:-mt-12">
          <div className="relative shrink-0">
            <Avatar
              src={player.profile_photo_url}
              alt={name}
              fallback={`${player.first_name} ${player.last_initial || ""}`}
              size="xl"
              className="h-24 w-24 border-4 border-card text-3xl shadow-xl sm:h-28 sm:w-28"
            />
            {photoAction}
          </div>
          {player.jersey_number && (
            <span className="mb-1 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-lg font-bold text-rose-300">
              #{player.jersey_number}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="break-words text-3xl font-extrabold tracking-tight sm:text-4xl">
              {name}
            </h2>
            {teamName && (
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {teamName}
              </p>
            )}
          </div>
          {action && (
            <div className="shrink-0 [&>button]:w-full sm:[&>button]:w-auto">
              {action}
            </div>
          )}
        </div>
        {facts.length > 0 && (
          <dl
            className={`mt-6 grid gap-2 ${facts.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
          >
            {facts.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="min-w-0 rounded-xl border border-border/70 bg-background/40 p-3"
              >
                <dt className="flex flex-col items-start gap-1.5 text-xs text-muted-foreground sm:flex-row sm:items-center">
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {label}
                </dt>
                <dd className="mt-1 break-words text-sm font-semibold">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

export function PlayerPersonality({
  player,
  title,
  emptyAction,
}: {
  player: {
    fav_nhl_city?: string | null;
    fav_nhl_player?: string | null;
    hockey_love?: string | null;
    season_goals?: string | null;
  };
  title: string;
  emptyAction?: ReactNode;
}) {
  const { t } = useTranslation();
  const tiles = [
    {
      value: player.fav_nhl_city,
      label: t("players.profile.favTeamReadLabel"),
      icon: MapPin,
      color: "text-slate-200 bg-slate-400/10 border-slate-400/20",
    },
    {
      value: player.fav_nhl_player,
      label: t("players.profile.favPlayerReadLabel"),
      icon: Trophy,
      color: "text-rose-200 bg-primary/10 border-primary/20",
    },
    {
      value: player.hockey_love,
      wide: true,
      label: t("players.profile.hockeyLoveReadLabel"),
      icon: Heart,
      color: "text-rose-300 bg-rose-400/10 border-rose-400/20",
    },
    {
      value: player.season_goals,
      wide: true,
      label: t("players.profile.seasonGoalsTitle"),
      icon: Target,
      color: "text-zinc-200 bg-zinc-400/10 border-zinc-400/20",
    },
  ].filter((tile) => tile.value);
  if (!tiles.length && !emptyAction) return null;
  return (
    <section aria-label={title}>
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <Star className="h-4 w-4 text-rose-300" aria-hidden="true" />
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(({ value, label, icon: Icon, color, wide }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 ${wide ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <div
              className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${color}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1.5 whitespace-pre-line break-words text-base font-semibold leading-snug sm:text-lg">
              {value}
            </p>
          </div>
        ))}
        {!tiles.length && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-5 sm:col-span-2">
            <Star className="mb-3 h-6 w-6 text-rose-300" aria-hidden="true" />
            <p className="mb-3 text-sm text-muted-foreground">
              {t(
                "players.profile.personalityPrompt",
                "A favorite player. A big hockey dream. Make this card your own.",
              )}
            </p>
            {emptyAction}
          </div>
        )}
      </div>
    </section>
  );
}
