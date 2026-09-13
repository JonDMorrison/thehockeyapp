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

        const { data: guardians, error: guardiansErr } = await supabase
          .from("player_guardians")
          .select("user_id, guardian_role")
          .eq("player_id", player.id);

        if (guardiansErr) {
          log("guardians_fetch_failed", {
            player_id: player.id,
            error: guardiansErr.message,
          });
          failed++;
          continue;
        }

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

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", recipientUserId)
          .maybeSingle();

        if (profileErr) {
          log("profile_fetch_failed", {
            player_id: player.id,
            error: profileErr.message,
          });
          failed++;
          continue;
        }

        const email = profile?.email;
        if (!email) {
          skipped++;
          continue;
        }

        // Create defaults lazily for older accounts, then honor the user's choice.
        let { data: preferences, error: preferenceErr } = await supabase
          .from("email_preferences")
          .select("player_weekly_progress, unsubscribe_token")
          .eq("user_id", recipientUserId)
          .maybeSingle();
        if (!preferences && !preferenceErr) {
          const created = await supabase
            .from("email_preferences")
            .insert({ user_id: recipientUserId })
            .select("player_weekly_progress, unsubscribe_token")
            .single();
          preferences = created.data;
          preferenceErr = created.error;
        }
        if (preferenceErr) {
          log("preferences_fetch_failed", {
            player_id: player.id,
            error: preferenceErr.message,
          });
          failed++;
          continue;
        }
        if (preferences?.player_weekly_progress === false) {
          skipped++;
          log("progress_email_opted_out", { player_id: player.id });
          continue;
        }

        // ── Aggregation (past 7 days) ──
        let sessionsCount = 0;
        const { count: sessCount, error: sessionsErr } = await supabase
          .from("session_completions")
          .select("id", { count: "exact", head: true })
          .eq("player_id", player.id)
          .eq("status", "complete")
          .gte("completed_at", weekAgo);
        if (sessionsErr) {
          log("sessions_count_failed", {
            player_id: player.id,
            error: sessionsErr.message,
          });
          sessionsCount = 0;
        } else {
          sessionsCount = sessCount ?? 0;
        }

        // ── Shots: scope to PUBLISHED TEAM practice cards (match get_season_report) ──
        let shotsCount = 0;
        const { data: taskComps, error: shotsErr } = await supabase
          .from("task_completions")
          .select(
            "shots_logged, practice_tasks!inner(practice_cards!inner(program_source, published_at))",
          )
          .eq("player_id", player.id)
          .eq("completed", true)
          .gte("completed_at", weekAgo)
          .eq("practice_tasks.practice_cards.program_source", "team")
          .not("practice_tasks.practice_cards.published_at", "is", null);
        if (shotsErr) {
          log("shots_sum_failed", {
            player_id: player.id,
            error: shotsErr.message,
          });
          shotsCount = 0;
        } else {
          shotsCount = (taskComps ?? []).reduce(
            (sum, tc) => sum + ((tc as { shots_logged: number | null }).shots_logged ?? 0),
            0,
          );
        }

        let streak = 0;
        const { data: streakData, error: streakErr } = await supabase.rpc(
          "calculate_solo_streak",
          { p_player_id: player.id },
        );
        if (streakErr) {
          log("streak_calc_failed", {
            player_id: player.id,
            error: streakErr.message,
          });
          streak = 0;
        } else {
          streak = typeof streakData === "number" ? streakData : 0;
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
                unsubscribeUrl: preferences?.unsubscribe_token
                  ? `https://www.hockeyapp.ca/unsubscribe/${preferences.unsubscribe_token}?kind=player_weekly_progress`
                  : undefined,
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
