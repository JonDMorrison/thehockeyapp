import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ShootingCapSettings({
  id,
  cap,
  locked = false,
  threshold = 1000,
}: {
  id: string;
  cap: number;
  locked?: boolean;
  threshold?: number;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(String(cap));
  const [reviewThreshold, setReviewThreshold] = useState(String(threshold));
  const [expected, setExpected] = useState(cap);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const valid =
    /^\d+$/.test(value) &&
    Number(value) >= 1 &&
    Number(value) <= 300 &&
    /^\d+$/.test(reviewThreshold) &&
    Number(reviewThreshold) >= 301 &&
    Number(reviewThreshold) <= 10000;
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !valid) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const { error } = await supabase.rpc("configure_shooting_rules", {
        p_id: id,
        p_cap: Number(value),
        p_threshold: Number(reviewThreshold),
        p_expected: expected,
      });
      if (error) throw error;
      setExpected(Number(value));
      await queryClient.invalidateQueries({
        queryKey: ["shooting-snapshot", id],
      });
      setMessage("Challenge rules saved.");
    } catch (error) {
      setFailed(true);
      await queryClient.invalidateQueries({
        queryKey: ["shooting-snapshot", id],
      });
      setMessage(
        (error as { message?: string }).message ||
          "Cap not saved. Please retry.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <details className="rounded-xl border border-border p-5">
      <summary className="min-h-11 cursor-pointer font-bold">
        Daily cap settings
      </summary>
      <form onSubmit={save} className="mt-4 space-y-3">
        <Label htmlFor="edit-daily-cap">Daily leaderboard cap</Label>
        <Input
          id="edit-daily-cap"
          type="number"
          inputMode="numeric"
          min={1}
          max={300}
          step={1}
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={busy || locked}
          aria-describedby="edit-cap-help"
        />
        <p id="edit-cap-help" className="text-xs text-muted-foreground">
          Maximum 300 leaderboard points per player per day. Once shots have
          been logged, the cap is locked. Additional practice stays in private
          history and earns no extra leaderboard points.
        </p>
        {locked && (
          <p className="text-sm">
            The cap is locked. Start a new challenge to use different rules.
          </p>
        )}
        <Label htmlFor="review-threshold">Private coach review threshold</Label>
        <Input
          id="review-threshold"
          type="number"
          min={301}
          max={10000}
          value={reviewThreshold}
          disabled={busy}
          onChange={(e) => setReviewThreshold(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Totals at or above this number appear in your private review list.
          This does not change scoring or accuse a player of cheating.
        </p>
        <Button type="submit" disabled={busy || !valid}>
          {busy ? "Saving…" : "Save daily cap"}
        </Button>
        {failed && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setValue(String(cap));
              setExpected(cap);
              setMessage("Latest cap loaded. Review it before saving.");
              setFailed(false);
            }}
          >
            Use latest cap ({cap})
          </Button>
        )}
        <p role={failed ? "alert" : "status"} className="text-sm">
          {message}
        </p>
      </form>
    </details>
  );
}
