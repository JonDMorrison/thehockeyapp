import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * check-notifications
 *
 * Scheduled edge function that evaluates three notification triggers:
 *   1. daily_reminder   — 6pm: incomplete workout today
 *   2. streak_at_risk   — 7pm: yesterday done, today not
 *   3. weekly_summary   — Sunday 7pm
 *
 * Entitlement-gated, rate-limited, idempotent.
 * Called by pg_cron every 30 minutes.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];
    const utcHour = new Date().getUTCHours();
    const dayOfWeek = new Date().getUTCDay(); // 0 = Sunday

    const stats = { daily_reminder: 0, streak_at_risk: 0, weekly_summary: 0, skipped: 0 };

    // ─── Get all players with their owner user_id ───
    const { data: players, error: playersErr } = await supabase
      .from("players")
      .select("id, first_name, owner_user_id");

    if (playersErr || !players) {
      console.error("Failed to fetch players:", playersErr);
      return new Response(JSON.stringify({ error: "Failed to fetch players" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Batch: get all today's solo cards and completions ───
    const { data: todayCards } = await supabase
      .from("personal_practice_cards")
      .select("id, player_id, date")
      .eq("date", today);

    const todayCardMap = new Map<string, string>(); // player_id -> card_id
    for (const card of todayCards || []) {
      todayCardMap.set(card.player_id, card.id);
    }

    const todayCardIds = (todayCards || []).map((c) => c.id);
    const { data: todayCompletions } = await supabase
      .from("personal_session_completions")
      .select("personal_practice_card_id, status")
      .in("personal_practice_card_id", todayCardIds.length > 0 ? todayCardIds : ["__none__"]);

    const completedCardIds = new Set(
      (todayCompletions || [])
        .filter((c) => c.status === "complete")
        .map((c) => c.personal_practice_card_id)
    );

    // ─── Batch: yesterday's completions for streak check ───
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data: yesterdayCards } = await supabase
      .from("personal_practice_cards")
      .select("id, player_id")
      .eq("date", yesterdayStr);

    const yesterdayCardIds = (yesterdayCards || []).map((c) => c.id);
    const { data: yesterdayCompletions } = await supabase
      .from("personal_session_completions")
      .select("personal_practice_card_id, status")
      .in(
        "personal_practice_card_id",
        yesterdayCardIds.length > 0 ? yesterdayCardIds : ["__none__"]
      );

    const yesterdayCompletedPlayerIds = new Set<string>();
    for (const yc of yesterdayCards || []) {
      const isComplete = (yesterdayCompletions || []).some(
        (c) => c.personal_practice_card_id === yc.id && c.status === "complete"
      );
      if (isComplete) yesterdayCompletedPlayerIds.add(yc.player_id);
    }

    // ─── Process each player ───
    for (const player of players) {
      const userId = player.owner_user_id;

      // ── 1. DAILY REMINDER (around 6pm UTC, adjustable) ──
      // We run every 30min; target 17:30-18:30 UTC window
      if (utcHour >= 17 && utcHour <= 18) {
        const cardId = todayCardMap.get(player.id);
        if (cardId && !completedCardIds.has(cardId)) {
          const idempKey = `daily_reminder:${player.id}:${today}`;

          const { data: sent } = await supabase.rpc("insert_notification_with_log", {
            p_user_id: userId,
            p_title: "🏒 Don't forget to train!",
            p_message: `${player.first_name}, your workout is waiting. Tap to get started.`,
            p_notification_type: "daily_reminder",
            p_idempotency_key: idempKey,
            p_metadata: { player_id: player.id, card_id: cardId },
          });

          if (sent) stats.daily_reminder++;
          else stats.skipped++;
        }
      }

      // ── 2. STREAK AT RISK (around 7pm UTC) ──
      if (utcHour >= 18 && utcHour <= 19) {
        if (yesterdayCompletedPlayerIds.has(player.id)) {
          const todayCardId = todayCardMap.get(player.id);
          const todayDone = todayCardId ? completedCardIds.has(todayCardId) : false;

          if (!todayDone) {
            const idempKey = `streak_at_risk:${player.id}:${today}`;

            const { data: sent } = await supabase.rpc("insert_notification_with_log", {
              p_user_id: userId,
              p_title: "🔥 Streak at risk!",
              p_message: `${player.first_name}'s streak is on the line. Complete today's workout to keep it alive!`,
              p_notification_type: "streak_at_risk",
              p_idempotency_key: idempKey,
              p_metadata: { player_id: player.id },
            });

            if (sent) stats.streak_at_risk++;
            else stats.skipped++;
          }
        }
      }

      // ── 3. WEEKLY SUMMARY (Sunday, 7pm UTC window) ──
      if (dayOfWeek === 0 && utcHour >= 18 && utcHour <= 19) {
        // Check entitlement: weekly summary is a pro feature
        const { data: canSummary } = await supabase.rpc("has_entitlement", {
          p_user_id: userId,
          p_key: "can_receive_ai_summary",
        });

        if (canSummary) {
          const weekKey = `weekly_summary:${player.id}:${today}`;

          const { data: sent } = await supabase.rpc("insert_notification_with_log", {
            p_user_id: userId,
            p_title: "📊 Your weekly training report",
            p_message: `${player.first_name}'s weekly summary is ready. See how the week went!`,
            p_notification_type: "weekly_summary",
            p_idempotency_key: weekKey,
            p_metadata: { player_id: player.id },
          });

          if (sent) stats.weekly_summary++;
          else stats.skipped++;
        }
      }
    }

    console.log("Notification check complete:", stats);

    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("check-notifications error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
