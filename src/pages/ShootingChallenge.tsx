import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { shootingSnapshot, displayShotDate } from "@/lib/shooting";
import { ShootingEntry } from "@/components/shooting/ShootingEntry";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Target, Trophy, ArrowLeft } from "lucide-react";

export default function ShootingChallenge() {
  const { challengeId = "" } = useParams();
  const [search, setSearch] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(search.get("player") || "");
  const [date, setDate] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const query = useQuery({
    queryKey: ["shooting-snapshot", challengeId, user?.id],
    enabled: !!user,
    queryFn: () => shootingSnapshot(challengeId),
    retry: false,
    refetchInterval: 10000,
  });
  useEffect(() => {
    if (!loading && !user)
      navigate(
        `/auth?redirect=${encodeURIComponent(`/shooting/${challengeId}${search.toString() ? `?${search}` : ""}`)}`,
        { replace: true },
      );
  }, [loading, user, navigate, challengeId, search]);
  const data = query.isError ? undefined : query.data;
  const choices =
    data?.players.filter(
      (p) => data.is_staff || (p.is_mine && p.active_member),
    ) || [];
  const player = choices.find((p) => p.player_id === selected) || choices[0];
  const shotDate =
    date ||
    (data && data.today > data.challenge.end_date
      ? data.challenge.end_date
      : data?.today || "");
  const invite = async () => {
    if (!data || inviteBusy) return;
    setInviteBusy(true);
    setInviteError("");
    try {
      const current = await supabase
        .from("team_invites")
        .select("token")
        .eq("team_id", data.challenge.team_id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (current.error) throw current.error;
      let token = current.data?.token;
      if (!token) {
        const created = await supabase.rpc("regenerate_team_invite", {
          p_team_id: data.challenge.team_id,
        });
        if (created.error) throw created.error;
        const result = created.data as {
          success?: boolean;
          token?: string;
          error?: string;
        };
        if (!result.success || !result.token)
          throw new Error(result.error || "Invite could not be created.");
        token = result.token;
      }
      setInviteLink(
        `${window.location.origin}/join/${token}?challenge=${challengeId}`,
      );
    } catch (err) {
      setInviteError(
        (err as { message?: string }).message ||
          "Could not create an invitation. Retry.",
      );
    } finally {
      setInviteBusy(false);
    }
  };
  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopyStatus("Link copied.");
    } catch {
      setCopyStatus("Copy unavailable. Select and copy the link below.");
      setInviteLink(link);
    }
  };
  if (!data)
    return (
      <AppShell hideNav>
        <PageContainer className="max-w-2xl">
          <h1 className="font-display text-2xl font-bold">
            Shooting challenge
          </h1>
          {query.isError ? (
            <AppCard className="mt-5 space-y-4">
              <p role="alert">
                Challenge unavailable. Check your connection or ask your coach
                for a team invitation.
              </p>
              <Button onClick={() => query.refetch()}>Try again</Button>
              <Button asChild variant="outline">
                <Link to="/today">Go to my home</Link>
              </Button>
            </AppCard>
          ) : (
            <p role="status">Loading challenge…</p>
          )}
        </PageContainer>
      </AppShell>
    );
  const c = data.challenge;
  const total = data.players.reduce((sum, p) => sum + p.total, 0);
  const participants = data.players.filter((p) => p.total > 0).length;
  const daysRemaining = Math.max(
    0,
    Math.round(
      (Date.parse(`${c.end_date}T12:00:00Z`) -
        Date.parse(`${data.today}T12:00:00Z`)) /
        86400000,
    ) + 1,
  );
  return (
    <AppShell hideNav>
      <PageContainer className="max-w-2xl space-y-5">
        <Button asChild variant="ghost">
          <Link
            to={
              data.is_staff
                ? `/teams/${c.team_id}`
                : player
                  ? `/players/${player.player_id}/home`
                  : "/today"
            }
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {data.is_staff ? "Team home" : "Player home"}
          </Link>
        </Button>
        <section className="rounded-xl border border-primary/25 bg-primary/[0.06] p-6">
          <Target aria-hidden="true" className="mb-3 h-8 w-8 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            {data.team_name} · {data.status}
          </p>
          <h1 className="mt-2 break-words font-display text-3xl font-black uppercase">
            {c.name}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {displayShotDate(c.start_date)} – {displayShotDate(c.end_date)} ·{" "}
            {c.timezone.replace(/_/g, " ")}
          </p>
          <p className="mt-2 text-sm">
            {data.status === "Live"
              ? `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} remaining · closes at midnight after the last day`
              : data.status === "Finished"
                ? "Final results · thank you for showing up and putting in the reps."
                : "Logging opens at midnight on the first day."}
          </p>
          {data.corrected && (
            <p className="mt-2 text-xs font-bold">
              Results include coach corrections.
            </p>
          )}
        </section>
        {data.is_staff && (
          <AppCard className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button disabled={inviteBusy} onClick={invite}>
                {inviteBusy ? "Preparing invite…" : "Invite families"}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  copy(`${window.location.origin}/shooting/${challengeId}`)
                }
              >
                Copy challenge link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Invite families to join this team and return straight to the
              challenge. The challenge link is for existing team members.
            </p>
            {inviteLink && (
              <div>
                <Label htmlFor="challenge-invite">Shareable link</Label>
                <Input
                  id="challenge-invite"
                  value={inviteLink}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  className="mt-2"
                  variant="outline"
                  onClick={() => copy(inviteLink)}
                >
                  Copy invitation
                </Button>
              </div>
            )}
            {inviteError && <p role="alert">{inviteError}</p>}
            <p role="status" className="text-sm">
              {copyStatus}
            </p>
          </AppCard>
        )}
        <div className="grid grid-cols-2 gap-3">
          <AppCard>
            <p
              className="font-display text-3xl font-bold tabular-nums"
              data-testid="challenge-total"
            >
              {total.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Team shots</p>
          </AppCard>
          <AppCard>
            <p className="font-display text-3xl font-bold tabular-nums">
              {participants} / {data.players.length}
            </p>
            <p className="text-sm text-muted-foreground">Players taking part</p>
          </AppCard>
        </div>
        {data.status === "Scheduled" && (
          <p className="text-sm text-muted-foreground">
            Logging opens on {displayShotDate(c.start_date)}. Your roster is
            ready.
          </p>
        )}
        {data.status !== "Scheduled" && choices.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="shot-player">
                  {data.is_staff ? "Player to correct" : "Logging for"}
                </Label>
                <select
                  id="shot-player"
                  className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={player?.player_id}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setDate("");
                    setSearch({ player: e.target.value }, { replace: true });
                  }}
                >
                  {choices.map((p) => (
                    <option key={p.player_id} value={p.player_id}>
                      {p.first_name} {p.last_initial || ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="shot-date">Shot date</Label>
                <Input
                  id="shot-date"
                  type="date"
                  value={shotDate}
                  min={player?.eligible_from}
                  max={data.today < c.end_date ? data.today : c.end_date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            {player && (
              <ShootingEntry
                key={`${c.id}:${player.player_id}:${shotDate}:${data.is_staff}`}
                viewerId={user!.id}
                snapshot={data}
                player={player}
                date={shotDate}
                correction={data.is_staff}
              />
            )}
          </>
        )}
        {!data.is_staff && !choices.length && (
          <p>
            No eligible child is linked to this account. Ask your coach to check
            your team membership.
          </p>
        )}
        <AppCard>
          <div className="flex items-center gap-2">
            <Trophy aria-hidden="true" className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">
              {data.status === "Finished"
                ? "Final standings"
                : "Team standings"}
            </h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Most shots wins. Ties share a place. Player/parent reported. Only
            visible inside your team.
          </p>
          {data.players.length === 0 ? (
            <p className="mt-5 text-sm">
              Your challenge is ready. Invite families to get the first shots on
              the board.
            </p>
          ) : (
            <ol className="mt-5 divide-y divide-border">
              {data.players.map((p) => (
                <li
                  key={p.player_id}
                  data-testid={`standing-${p.player_id}`}
                  className={`flex items-center gap-3 py-4 ${p.is_mine ? "font-bold" : ""}`}
                >
                  <span className="w-7 shrink-0 text-center tabular-nums">
                    {p.rank ?? "—"}
                  </span>
                  <span className="min-w-0 flex-1 break-words">
                    {p.first_name} {p.last_initial || ""}
                    {p.is_mine && (
                      <span className="ml-2 text-xs text-primary">
                        Your player
                      </span>
                    )}
                    {!p.active_member && (
                      <span className="block text-xs text-muted-foreground">
                        Former team member
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">
                    {p.total
                      ? `${p.total.toLocaleString()} shots`
                      : "No shots logged yet"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </AppCard>
        {data.is_staff && data.audit.length > 0 && (
          <details className="rounded-xl border border-border p-5">
            <summary className="cursor-pointer font-bold">
              Shot history and corrections
            </summary>
            <ul className="mt-3 divide-y divide-border text-sm">
              {data.audit.map((a, i) => (
                <li key={`${a.created_at}:${i}`} className="py-3">
                  <strong>
                    {
                      data.players.find((p) => p.player_id === a.player_id)
                        ?.first_name
                    }
                  </strong>{" "}
                  · {displayShotDate(a.shot_date)} · {a.previous_shots} →{" "}
                  {a.shots}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.reason || "Player/parent daily total"} ·{" "}
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </PageContainer>
    </AppShell>
  );
}
