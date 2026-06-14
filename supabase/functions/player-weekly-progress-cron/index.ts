import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function jsonResp(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const log = (msg: string, extra?: Record<string, unknown>) =>
    console.log(
      JSON.stringify({ fn: "player-weekly-progress-cron", msg, ...extra }),
    );

  // ── Caller secret guard (verify_jwt is false for this function) ──
  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || !provided || provided !== CRON_SECRET) {
    log("unauthorized");
    return jsonResp({ error: "Unauthorized" }, 401);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // ── All players ──
    const { data: players, error: playersErr } = await supabase
      .from("players")
      .select("id, first_name, owner_user_id");

    if (playersErr) {
      log("players_fetch_failed", { error: playersErr.message });
      return jsonResp({ error: "Failed to fetch players" }, 500);
    }

    let processed = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const player of players ?? []) {
      processed++;
      try {
        // ── Recipient resolution ──
        // Prefer a linked guardian (owner role first), else the player's owner account.
        let recipientUserId: string | null = null;

        const { data: guardians } = await supabase
          .from("player_guardians")
          .select("user_id, guardian_role")
          .eq("player_id", player.id);

        if (guardians && guardians.length > 0) {
          const owner = guardians.find((g) => g.guardian_role === "owner");
          recipientUserId = (owner ?? guardians[0]).user_id;
        } else if (player.owner_user_id) {
          recipientUserId = player.owner_user_id;
        }

        if (!recipientUserId) {
          skipped++;
          continue;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", recipientUserId)
          .maybeSingle();

        const email = profile?.email;
        if (!email) {
          skipped++;
          continue;
        }

        // TODO: no opt-out field exists — add one and honor it.

        // ── Aggregation (past 7 days) ──
        let sessionsCount = 0;
        try {
          const { count } = await supabase
            .from("session_completions")
            .select("id", { count: "exact", head: true })
            .eq("player_id", player.id)
            .eq("status", "complete")
            .gte("completed_at", weekAgo);
          sessionsCount = count ?? 0;
        } catch {
          sessionsCount = 0;
        }

        let shotsCount = 0;
        try {
          const { data: taskComps } = await supabase
            .from("task_completions")
            .select("shots_logged")
            .eq("player_id", player.id)
            .eq("completed", true)
            .gte("completed_at", weekAgo);
          shotsCount = (taskComps ?? []).reduce(
            (sum, tc) => sum + (tc.shots_logged ?? 0),
            0,
          );
        } catch {
          shotsCount = 0;
        }

        let streak = 0;
        try {
          const { data: streakData } = await supabase.rpc(
            "calculate_solo_streak",
            { p_player_id: player.id },
          );
          streak = typeof streakData === "number" ? streakData : 0;
        } catch {
          streak = 0;
        }

        // ── Send via send-transactional-email ──
        const emailRes = await fetch(
          `${SUPABASE_URL}/functions/v1/send-transactional-email`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "player_weekly_progress",
              to: email,
              data: {
                firstName: player.first_name,
                playerId: player.id,
                sessionsCount,
                shotsCount,
                streak,
              },
            }),
          },
        );

        if (!emailRes.ok) {
          const body = await emailRes.text();
          log("send_failed", {
            player_id: player.id,
            status: emailRes.status,
            body,
          });
          failed++;
          continue;
        }

        sent++;
        log("player_recap_sent", {
          player_id: player.id,
          sessionsCount,
          shotsCount,
        });
      } catch (playerErr) {
        log("player_error", {
          player_id: player.id,
          error:
            playerErr instanceof Error ? playerErr.message : String(playerErr),
        });
        failed++;
      }
    }

    log("completed", { processed, sent, skipped, failed });
    return jsonResp({ success: true, processed, sent, skipped, failed });
  } catch (error) {
    log("unhandled_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResp(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
