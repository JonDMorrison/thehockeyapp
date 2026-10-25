import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ShootingCapSettings({ id, cap }: { id: string; cap: number }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(String(cap));
  const [expected, setExpected] = useState(cap);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const valid =
    /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 10000;
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !valid) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const { error } = await supabase.rpc("set_shooting_challenge_cap", {
        p_id: id,
        p_daily_cap: Number(value),
        p_expected_cap: expected,
      });
      if (error) throw error;
      setExpected(Number(value));
      await queryClient.invalidateQueries({
        queryKey: ["shooting-snapshot", id],
      });
      setMessage("Daily cap saved. All standings have been recalculated.");
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
          max={10000}
          step={1}
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={busy}
          aria-describedby="edit-cap-help"
        />
        <p id="edit-cap-help" className="text-xs text-muted-foreground">
          Applies to every player and every day in this challenge, including
          past entries. Extra shots stay saved as bonus effort. Rankings and
          Bonus Boss badges update to match. 300 recommended.
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
