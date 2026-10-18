import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  const [name, setName] = useState("Team Shooting Challenge");
  const [zone, setZone] = useState(zones[0]);
  const [start, setStart] = useState(() => dateInZone(zones[0]));
  const [duration, setDuration] = useState("7");
  const [customEnd, setCustomEnd] = useState(() =>
    addCalendarDays(dateInZone(zones[0]), 6),
  );
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const publication = useRef({ id: crypto.randomUUID(), payload: "" });
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
        `/auth?redirect=${encodeURIComponent(`/teams/${teamId}/shooting/new`)}`,
        { replace: true },
      );
  }, [loading, user, navigate, teamId]);
  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busyRef.current || !user || !teamId) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = JSON.stringify([teamId, name.trim(), start, end, zone]);
      if (
        publication.current.payload &&
        publication.current.payload !== payload
      )
        publication.current.id = crypto.randomUUID();
      publication.current.payload = payload;
      const { data, error } = await supabase.rpc("create_shooting_challenge", {
        p_id: publication.current.id,
        p_team: teamId,
        p_name: name.trim(),
        p_start: start,
        p_end: end,
        p_timezone: zone,
      });
      if (error) throw error;
      navigate(`/shooting/${data}`);
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
    <AppShell hideNav>
      <PageContainer className="max-w-xl space-y-5">
        <Button variant="ghost" onClick={() => navigate(`/teams/${teamId}`)}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Team home
        </Button>
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
              <p className="text-sm text-muted-foreground">
                Most shots wins. Ties share a place. Results are visible only
                inside your team. You can invite families after publishing.
              </p>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="min-h-12 w-full font-bold"
                disabled={busy || !name.trim() || !start || !end || end < start}
              >
                {busy && (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                )}
                {busy ? "Publishing…" : "Publish challenge"}
              </Button>
            </form>
          </AppCard>
        )}
      </PageContainer>
    </AppShell>
  );
}
