import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type ShootingSnapshot, displayShotDate } from "@/lib/shooting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function ShootingReviewQueue({
  snapshot,
}: {
  snapshot: ShootingSnapshot;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const entries = snapshot.review_entries || [];
  const pending = entries.filter((e) => !e.reviewed);
  async function review(entry: (typeof entries)[number], key: string) {
    if (busy || (note[key] || "").trim().length < 3) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.rpc("review_shooting_entry", {
        p_id: snapshot.challenge.id,
        p_player: entry.player_id,
        p_date: entry.shot_date,
        p_version: entry.version,
        p_note: note[key].trim(),
      });
      if (error) throw error;
      await queryClient.invalidateQueries({
        queryKey: ["shooting-snapshot", snapshot.challenge.id],
      });
      setMessage("Entry reviewed. Leaderboard credit is unchanged.");
    } catch (e) {
      setMessage(
        (e as { message?: string }).message || "Review not saved. Retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded-xl border border-border p-5">
      <summary className="min-h-11 cursor-pointer font-bold">
        Coach review · {pending.length} to review
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">
        Totals of {snapshot.challenge.review_threshold || 1000} or more appear
        here privately. Review does not add leaderboard points. Use coach
        corrections to fix an incorrect total.
      </p>
      <div className="mt-4 space-y-4">
        {pending.length ? (
          pending.map((entry) => {
            const key = `${entry.player_id}:${entry.shot_date}:${entry.version}`;
            const player = snapshot.players.find(
              (p) => p.player_id === entry.player_id,
            );
            return (
              <div
                className="space-y-3 rounded-lg border border-border p-4"
                key={key}
              >
                <p className="font-semibold">
                  {player?.first_name} {player?.last_initial} ·{" "}
                  {displayShotDate(entry.shot_date)} ·{" "}
                  {entry.shots.toLocaleString()} actual shots
                </p>
                <Label htmlFor={`review-${key}`}>Private review note</Label>
                <Input
                  id={`review-${key}`}
                  value={note[key] || ""}
                  maxLength={500}
                  onChange={(e) =>
                    setNote((n) => ({ ...n, [key]: e.target.value }))
                  }
                  placeholder="Confirmed with family, or note the follow-up"
                />
                <Button
                  disabled={busy || (note[key] || "").trim().length < 3}
                  onClick={() => void review(entry, key)}
                >
                  Mark reviewed
                </Button>
              </div>
            );
          })
        ) : (
          <p className="text-sm">No entries need review.</p>
        )}
        {entries
          .filter((e) => e.reviewed)
          .map((entry) => (
            <p
              className="text-sm text-muted-foreground"
              key={`${entry.player_id}:${entry.shot_date}`}
            >
              Reviewed ·{" "}
              {
                snapshot.players.find((p) => p.player_id === entry.player_id)
                  ?.first_name
              }{" "}
              · {displayShotDate(entry.shot_date)} · {entry.note}
            </p>
          ))}
      </div>
      <p role="status" className="mt-3 text-sm">
        {message}
      </p>
    </details>
  );
}
