import { readShotDraft, storeShotDraft } from "@/lib/shootingDrafts";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type ShotSave,
  type ShootingSnapshot,
  type ShootingPlayer,
  displayShotDate,
} from "@/lib/shooting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface Props {
  snapshot: ShootingSnapshot;
  player: ShootingPlayer;
  date: string;
  correction?: boolean;
  viewerId: string;
}
export function ShootingEntry({
  snapshot,
  player,
  date,
  correction = false,
  viewerId,
}: Props) {
  const queryClient = useQueryClient();
  const id = snapshot.challenge.id;
  const day = snapshot.days.find(
    (d) => d.player_id === player.player_id && d.shot_date === date,
  );
  const storageKey = `shot-draft:${viewerId}:${id}:${player.player_id}:${date}:${correction}`;
  const [draft] = useState(() => readShotDraft(storageKey));
  const [value, setValue] = useState(draft?.value ?? String(day?.shots ?? 0));
  const [version, setVersion] = useState(draft?.version ?? day?.version ?? 0);
  const [reason, setReason] = useState(draft?.reason ?? "");
  const [dirty, setDirty] = useState(!!draft);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const request = useRef(draft?.request || crypto.randomUUID());
  const [message, setMessage] = useState(
    draft?.problem ||
      (draft?.queued
        ? "Waiting to sync. Saved on this device."
        : draft
          ? "Unsaved draft restored from this device."
          : ""),
  );
  const [queued, setQueued] = useState(!!draft?.queued);
  const [conflict, setConflict] = useState<ShotSave | null>(
    draft?.conflict || null,
  );
  const [failed, setFailed] = useState(false);
  const minDate = player.eligible_from;
  const canSave = correction
    ? date <= snapshot.today
    : snapshot.status === "Live" && player.active_member;
  const cap = snapshot.challenge.daily_cap ?? 300;
  const credited = Math.min(Number(value) || 0, cap);
  const bonus = Math.max((Number(value) || 0) - cap, 0);
  const valid = /^\d+$/.test(value) && Number(value) <= 10000;

  useEffect(() => {
    if (!dirty && !savingRef.current && (day?.version ?? 0) >= version) {
      setValue(String(day?.shots ?? 0));
      setVersion(day?.version ?? 0);
    }
  }, [day?.shots, day?.version, dirty, version]);
  useEffect(() => {
    try {
      if (dirty)
        storeShotDraft(storageKey, {
          value,
          version,
          request: request.current,
          reason,
          userId: viewerId,
          challengeId: id,
          playerId: player.player_id,
          date,
          correction,
          queued,
          conflict: conflict || undefined,
          problem: failed ? message : undefined,
        });
      else localStorage.removeItem(storageKey);
    } catch {
      if (dirty)
        setMessage(
          "This device cannot keep a draft. Stay on this page and reconnect to save.",
        );
    }
  }, [
    dirty,
    value,
    version,
    reason,
    storageKey,
    viewerId,
    id,
    player.player_id,
    date,
    correction,
    queued,
    conflict,
    failed,
    message,
  ]);
  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.key !== storageKey || detail.request !== request.current)
        return;
      if (detail.result) {
        setValue(String(detail.result.shots));
        setVersion(detail.result.version);
        setDirty(false);
        setQueued(false);
        setFailed(false);
        setMessage("Shots saved after reconnecting.");
        void queryClient.invalidateQueries({
          queryKey: ["shooting-snapshot", id],
        });
      } else {
        setMessage(detail.problem);
        setFailed(true);
        setConflict(detail.conflict || null);
        setQueued(!!readShotDraft(storageKey)?.queued);
      }
    };
    window.addEventListener("shooting-draft-result", receive);
    return () => window.removeEventListener("shooting-draft-result", receive);
  }, [storageKey, queryClient, id]);

  const workoutShots = useQuery({
    queryKey: ["workout-shot-suggestion", viewerId, player.player_id, date],
    enabled: player.is_mine && !correction,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_completions")
        .select(
          "shots_logged, practice_tasks!inner(practice_cards!inner(date))",
        )
        .eq("player_id", player.player_id)
        .eq("practice_tasks.practice_cards.date", date);
      if (error) throw error;
      return Math.min(
        10000,
        (data || []).reduce(
          (sum, row) => sum + Math.max(0, row.shots_logged || 0),
          0,
        ),
      );
    },
  });
  const edit = (next: string) => {
    request.current = crypto.randomUUID();
    setValue(next);
    setDirty(true);
    setQueued(false);
    setMessage("Draft · not saved yet");
    setFailed(false);
  };
  const save = async () => {
    if (savingRef.current || !valid || conflict || !canSave) return;
    savingRef.current = true;
    setSaving(true);
    setMessage("");
    setFailed(false);
    try {
      if (!navigator.onLine) {
        storeShotDraft(storageKey, {
          value,
          version,
          request: request.current,
          reason,
          userId: viewerId,
          challengeId: id,
          playerId: player.player_id,
          date,
          correction,
          queued: true,
        });
        setQueued(true);
        setDirty(true);
        setMessage("Waiting to sync. Saved on this device for this date.");
        return;
      }
      // Prevent an already queued draft racing a manual online save.
      try {
        storeShotDraft(storageKey, {
          value,
          version,
          request: request.current,
          reason,
          userId: viewerId,
          challengeId: id,
          playerId: player.player_id,
          date,
          correction,
          queued: false,
        });
      } catch {
        /* Online saves remain available without draft storage. */
      }
      setQueued(false);
      const { data, error } = await supabase.rpc(
        "save_shooting_challenge_day",
        {
          p_id: id,
          p_player: player.player_id,
          p_date: date,
          p_shots: Number(value),
          p_version: version,
          p_request: request.current,
          p_reason: correction ? reason.trim() : undefined,
        },
      );
      if (error) throw error;
      const result = data as unknown as ShotSave;
      if (result.conflict) {
        setConflict(result);
        setFailed(true);
        return;
      }
      setVersion(result.version);
      setValue(String(result.shots));
      setDirty(false);
      setQueued(false);
      setMessage(
        `${result.shots.toLocaleString()} shots saved for ${date === snapshot.today ? "today" : displayShotDate(date)}.`,
      );
      await queryClient.invalidateQueries({
        queryKey: ["shooting-snapshot", id],
      });
    } catch (error) {
      setDirty(true);
      setFailed(true);
      setMessage(
        `Not saved—retry. ${error instanceof Error ? error.message : (error as { message?: string }).message || "Please try again."}`,
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  return (
    <section
      aria-label={`Log shots for ${player.first_name}`}
      className="space-y-4 rounded-xl border border-primary/25 bg-primary/[0.05] p-5"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          {correction ? "Coach correction" : "Your shooting challenge"}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold">
          {player.first_name} {player.last_initial || ""}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {date === snapshot.today
          ? correction
            ? "Shots logged today"
            : "Your shots today"
          : `Total for ${displayShotDate(date)}`}{" "}
        · eligible from {displayShotDate(minDate)}
      </p>
      <div>
        <Label htmlFor={`shots-${player.player_id}`}>Daily shot total</Label>
        <Input
          id={`shots-${player.player_id}`}
          className="mt-2 h-16 text-3xl font-bold tabular-nums"
          type="number"
          inputMode="numeric"
          min={0}
          max={10000}
          step={1}
          value={value}
          onChange={(e) => edit(e.target.value)}
          disabled={saving || !canSave}
          aria-describedby={`shot-help-${player.player_id}`}
        />
      </div>
      {valid && (
        <div
          aria-label="Daily shot breakdown"
          className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-background/50 p-4"
        >
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {credited.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground">
                {" "}
                / {cap.toLocaleString()}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Leaderboard points</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">
              +{bonus.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Additional practice</p>
          </div>
          <div
            className="col-span-2 h-2 rounded-full bg-muted overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${(credited / cap) * 100}%` }}
            />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        {[25, 50, 100].map((n) => (
          <Button
            type="button"
            variant="outline"
            key={n}
            disabled={saving || !canSave || !valid || Number(value) + n > 10000}
            onClick={() => edit(String(Number(value) + n))}
          >
            +{n}
          </Button>
        ))}
      </div>
      {!correction && Number(workoutShots.data) > 0 && (
        <Button
          variant="outline"
          disabled={saving || queued || !canSave}
          onClick={() => {
            if (
              window.confirm(
                `Replace this challenge total with ${workoutShots.data} logged team workout shots for this date? Add any other practice manually before saving.`,
              )
            )
              edit(String(workoutShots.data));
          }}
        >
          Use {workoutShots.data} logged team workout shots
        </Button>
      )}
      {workoutShots.isError && (
        <Button variant="ghost" onClick={() => void workoutShots.refetch()}>
          Retry workout shot suggestion
        </Button>
      )}
      <p
        id={`shot-help-${player.player_id}`}
        className="text-xs text-muted-foreground"
      >
        Save the full daily total, not an additional amount. Workout shot logs
        are separate; include them in this total once. Whole numbers from 0 to
        10,000. Up to {cap.toLocaleString()} per day count toward the
        leaderboard; the rest are automatically kept in private practice
        history.
      </p>
      {correction && (
        <div>
          <Label htmlFor="correction-reason">Reason for correction</Label>
          <Input
            id="correction-reason"
            value={reason}
            minLength={3}
            maxLength={500}
            onChange={(e) => {
              request.current = crypto.randomUUID();
              setReason(e.target.value);
              setDirty(true);
            }}
            disabled={saving}
          />
        </div>
      )}
      {conflict && (
        <div
          role="alert"
          className="space-y-3 rounded-lg border border-border bg-card p-4"
        >
          <p>
            Another device saved {conflict.shots.toLocaleString()} shots. Review
            before replacing that total.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setValue(String(conflict.shots));
                setVersion(conflict.version);
                setConflict(null);
                setDirty(false);
                setQueued(false);
                setFailed(false);
              }}
            >
              Use latest saved total
            </Button>
            <Button
              onClick={() => {
                setVersion(conflict.version);
                request.current = crypto.randomUUID();
                setConflict(null);
                setDirty(true);
                setFailed(false);
                setMessage("Reviewed. Save again to replace the daily total.");
              }}
            >
              Keep my {value} and review save
            </Button>
          </div>
        </div>
      )}
      <Button
        className="min-h-12 w-full font-bold"
        disabled={
          saving ||
          !valid ||
          !!conflict ||
          queued ||
          !canSave ||
          (correction && reason.trim().length < 3)
        }
        onClick={save}
      >
        {saving && (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        )}
        {saving
          ? "Saving…"
          : queued
            ? "Waiting to sync"
            : failed
              ? "Retry save"
              : correction
                ? "Save correction"
                : date === snapshot.today
                  ? "Save today’s total"
                  : "Save daily total"}
      </Button>
      {!canSave && (
        <p className="text-sm text-muted-foreground">
          {snapshot.status === "Finished"
            ? "Final results. Ask your coach about corrections."
            : snapshot.status === "Scheduled"
              ? "Logging opens on the start date."
              : "This player is no longer on the team."}
        </p>
      )}
      <p
        role={failed ? "alert" : "status"}
        className={
          failed ? "text-sm text-destructive" : "text-sm text-muted-foreground"
        }
      >
        {message}
      </p>
      <p className="text-sm">
        {correction ? "Player’s leaderboard total:" : "Your leaderboard total:"}{" "}
        <strong className="tabular-nums">
          {player.total.toLocaleString()} shots
        </strong>
      </p>
    </section>
  );
}
