import { fireSmallConfetti } from "@/lib/confetti";
import { FirstChallengeSteps } from "@/components/shooting/FirstChallengeSteps";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { addCalendarDays, dateInZone, displayShotDate } from "@/lib/shooting";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Target } from "lucide-react";

const zones = Array.from(
  new Set([
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    "America/Vancouver",
    "America/Edmonton",
    "America/Winnipeg",
    "America/Toronto",
    "America/Halifax",
    "America/St_Johns",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "UTC",
    ...((
      Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.("timeZone") || []),
  ]),
);
export default function ShootingChallengeNew() {
  const { id: teamId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const firstChallenge = search.get("first") === "1";
  const draftKey = `shooting-setup:v1:${teamId}`;
  const [draft] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) || "null");
      return saved &&
        typeof saved.name === "string" &&
        zones.includes(saved.zone) &&
        /^\d{4}-\d{2}-\d{2}$/.test(saved.start) &&
        /^\d{4}-\d{2}-\d{2}$/.test(saved.customEnd) &&
        ["7", "14", "30", "custom"].includes(saved.duration) &&
        /^[0-9a-f-]{36}$/i.test(saved.publication?.id) &&
        typeof saved.publication?.payload === "string"
        ? (saved as {
            dailyCap?: string;
            name: string;
            zone: string;
            start: string;
            customEnd: string;
            duration: string;
            publication: { id: string; payload: string };
          })
        : null;
    } catch {
      return null;
    }
  });
  const [name, setName] = useState(draft?.name ?? "Team Shooting Challenge");
  const [zone, setZone] = useState(draft?.zone ?? zones[0]);
  const [start, setStart] = useState(
    () => draft?.start ?? dateInZone(zones[0]),
  );
  const [duration, setDuration] = useState(
    () =>
      draft?.duration ??
      (["7", "14", "30"].includes(search.get("days") || "")
        ? search.get("days")!
        : "7"),
  );
  const [customEnd, setCustomEnd] = useState(
    () => draft?.customEnd ?? addCalendarDays(dateInZone(zones[0]), 6),
  );
  const [dailyCap, setDailyCap] = useState(draft?.dailyCap ?? "300");
  const validCap =
    /^\d+$/.test(dailyCap) &&
    Number(dailyCap) >= 0 &&
    Number(dailyCap) <= 10000;
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const publication = useRef(
    draft?.publication ?? { id: crypto.randomUUID(), payload: "" },
  );
  const rememberDraft = () => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          name,
          zone,
          start,
          duration,
          customEnd,
          dailyCap,
          publication: publication.current,
        }),
      );
    } catch {
      /* In-memory retries still work if storage is unavailable. */
    }
  };
  useEffect(() => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          name,
          zone,
          start,
          duration,
          customEnd,
          dailyCap,
          publication: publication.current,
        }),
      );
    } catch {
      /* Optional session draft. */
    }
  }, [draftKey, name, zone, start, duration, customEnd, dailyCap]);
  const end =
    duration === "custom"
      ? customEnd
      : start
        ? addCalendarDays(start, Number(duration) - 1)
        : "";
  const access = useQuery({
    queryKey: ["shooting-create-access", teamId, user?.id],
    enabled: !!user && !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_roles")
        .select("id")
        .eq("team_id", teamId!)
        .eq("user_id", user!.id);
      if (error) throw error;
      return !!data?.length;
    },
  });
  useEffect(() => {
    if (!loading && !user)
      navigate(
        `/auth?redirect=${encodeURIComponent(`/teams/${teamId}/shooting/new${search.toString() ? `?${search}` : ""}`)}`,
        { replace: true },
      );
  }, [loading, user, navigate, teamId, search]);
  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busyRef.current || !user || !teamId || !validCap) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = JSON.stringify([
        teamId,
        name.trim(),
        start,
        end,
        zone,
        dailyCap,
      ]);
      if (
        publication.current.payload &&
        publication.current.payload !== payload
      )
        publication.current.id = crypto.randomUUID();
      publication.current.payload = payload;
      rememberDraft();
      const { data, error } = await supabase.rpc(
        "create_capped_shooting_challenge",
        {
          p_id: publication.current.id,
          p_team: teamId,
          p_name: name.trim(),
          p_start: start,
          p_end: end,
          p_timezone: zone,
          p_daily_cap: Number(dailyCap),
        },
      );
      if (error) throw error;
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* Optional session draft. */
      }
      fireSmallConfetti();
      if (firstChallenge)
        navigate(`/shooting/${data}?invite=1`, { replace: true });
      else navigate(`/shooting/${data}`);
    } catch (err) {
      setError(
        `Challenge not published. ${(err as { message?: string }).message || "Please retry."}`,
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return (
    <AppShell hideNav hideUserMenu={firstChallenge}>
      <PageContainer className="max-w-xl space-y-5">
        {firstChallenge && <FirstChallengeSteps step={2} />}
        {!firstChallenge && (
          <Button variant="ghost" onClick={() => navigate(`/teams/${teamId}`)}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Team home
          </Button>
        )}
        <div>
          <Target aria-hidden="true" className="mb-3 h-8 w-8 text-primary" />
          <h1 className="font-display text-3xl font-black uppercase">
            Start a shooting challenge
          </h1>
          <p className="mt-2 text-muted-foreground">
            Choose the dates. Invite your team. Let the shots add up.
          </p>
        </div>
        {loading || access.isPending ? (
          <p role="status">Checking team access…</p>
        ) : access.isError ? (
          <AppCard>
            <p role="alert">Could not check team access.</p>
            <Button onClick={() => access.refetch()}>Try again</Button>
          </AppCard>
        ) : !access.data ? (
          <p role="alert">Only this team’s staff can publish a challenge.</p>
        ) : (
          <AppCard>
            <form className="space-y-5" onSubmit={publish}>
              <details open={firstChallenge ? undefined : true}>
                <summary className="cursor-pointer py-2 text-sm font-medium">
                  Challenge name & time zone
                </summary>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label htmlFor="challenge-name">Challenge name</Label>
                    <Input
                      id="challenge-name"
                      value={name}
                      maxLength={100}
                      required
                      onChange={(e) => setName(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <Label htmlFor="challenge-zone">Time zone</Label>
                    <select
                      id="challenge-zone"
                      className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={zone}
                      onChange={(e) => {
                        setZone(e.target.value);
                        if (start === dateInZone(zone))
                          setStart(dateInZone(e.target.value));
                      }}
                      disabled={busy}
                    >
                      {zones.map((z) => (
                        <option key={z} value={z}>
                          {z.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </details>
              <div>
                <Label htmlFor="challenge-start">Starts</Label>
                <Input
                  id="challenge-start"
                  type="date"
                  value={start}
                  min={dateInZone(zone)}
                  required
                  onChange={(e) => setStart(e.target.value)}
                  disabled={busy}
                />
              </div>
              <fieldset disabled={busy}>
                <legend className="mb-2 text-sm font-medium">Duration</legend>
                <div className="flex flex-wrap gap-2">
                  {["7", "14", "30", "custom"].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant={d === duration ? "default" : "outline"}
                      aria-pressed={d === duration}
                      onClick={() => setDuration(d)}
                    >
                      {d === "custom" ? "Custom dates" : `${d} days`}
                    </Button>
                  ))}
                </div>
              </fieldset>
              {duration === "custom" && (
                <div>
                  <Label htmlFor="challenge-end">Ends</Label>
                  <Input
                    id="challenge-end"
                    type="date"
                    value={customEnd}
                    min={start}
                    required
                    onChange={(e) => setCustomEnd(e.target.value)}
                    disabled={busy}
                  />
                </div>
              )}
              {start && end && (
                <p className="rounded-lg bg-muted p-4 text-sm">
                  <strong>
                    {displayShotDate(start)} – {displayShotDate(end)}
                  </strong>
                  <br />
                  Both dates included. Closes at midnight after the last day, in{" "}
                  {zone.replace(/_/g, " ")}.
                </p>
              )}
              <details className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2">
                <summary className="min-h-11 cursor-pointer font-semibold">
                  Scoring rules ·{" "}
                  {dailyCap === "0"
                    ? "No daily cap"
                    : `${dailyCap} daily points`}
                </summary>
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={dailyCap === "0"}
                    onChange={(e) =>
                      setDailyCap(e.target.checked ? "0" : "300")
                    }
                  />
                  No daily cap
                </label>
                <Label htmlFor="daily-cap">Daily leaderboard cap</Label>
                <Input
                  id="daily-cap"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={10000}
                  step={1}
                  required
                  value={dailyCap}
                  onChange={(e) => setDailyCap(e.target.value)}
                  disabled={busy}
                  aria-describedby="cap-help"
                />
                <p id="cap-help" className="text-xs text-muted-foreground">
                  Set 0 for no daily competition cap. Coaches can change the
                  allowance later in Daily shot rules.
                </p>
              </details>
              <p className="text-sm text-muted-foreground">
                Most leaderboard shots wins. Ties share a place. Results are
                visible only inside your team. You can invite families after
                publishing.
              </p>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="min-h-12 w-full font-bold"
                disabled={
                  busy ||
                  !validCap ||
                  !name.trim() ||
                  !start ||
                  !end ||
                  end < start
                }
              >
                {busy && (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                )}
                {busy
                  ? "Publishing…"
                  : firstChallenge
                    ? "Create challenge & invite families"
                    : "Publish challenge"}
              </Button>
            </form>
          </AppCard>
        )}
      </PageContainer>
    </AppShell>
  );
}
