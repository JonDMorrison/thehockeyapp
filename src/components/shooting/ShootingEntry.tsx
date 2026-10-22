import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  const [draft] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      return saved &&
        typeof saved.value === "string" &&
        Number.isInteger(saved.version) &&
        saved.version >= 0 &&
        typeof saved.request === "string" &&
        /^[0-9a-f-]{36}$/i.test(saved.request) &&
        typeof saved.reason === "string"
        ? (saved as {
            value: string;
            version: number;
            request: string;
            reason: string;
          })
        : null;
    } catch {
      return null;
    }
  });
  const [value, setValue] = useState(draft?.value ?? String(day?.shots ?? 0));
  const [version, setVersion] = useState(draft?.version ?? day?.version ?? 0);
  const [reason, setReason] = useState(draft?.reason ?? "");
  const [dirty, setDirty] = useState(!!draft);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const request = useRef(draft?.request || crypto.randomUUID());
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState<ShotSave | null>(null);
  const [failed, setFailed] = useState(false);
  const minDate = player.eligible_from;
  const canSave = correction
    ? date <= snapshot.today
    : snapshot.status === "Live" && player.active_member;
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
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ value, version, request: request.current, reason }),
        );
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* Storage may be disabled; the entered value still remains in memory. */
    }
  }, [dirty, value, version, reason, storageKey]);

  const edit = (next: string) => {
    request.current = crypto.randomUUID();
    setValue(next);
    setDirty(true);
    setMessage("");
    setFailed(false);
  };
  const save = async () => {
    if (savingRef.current || !valid || conflict || !canSave) return;
    savingRef.current = true;
    setSaving(true);
    setMessage("");
    setFailed(false);
    try {
      if (!navigator.onLine)
        throw new Error("You’re offline. Reconnect, then retry.");
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
      <p
        id={`shot-help-${player.player_id}`}
        className="text-xs text-muted-foreground"
      >
        Save the full daily total, not an additional amount. Whole numbers from
        0 to 10,000.
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
        {correction ? "Player’s challenge total:" : "Your challenge total:"}{" "}
        <strong className="tabular-nums">
          {player.total.toLocaleString()} shots
        </strong>
      </p>
    </section>
  );
}
