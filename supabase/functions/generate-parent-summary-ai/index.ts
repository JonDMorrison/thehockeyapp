import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are writing a weekly training summary for a parent who runs their child's at-home hockey development program. This is completely separate from any team or coach program.

RULES:
1. 4–6 sentences maximum.
2. Encouraging but genuine — never cheesy or over-the-top.
3. Call out exactly ONE specific win from the week (e.g. "completed every scheduled workout", "logged 150+ shots").
4. Suggest exactly ONE concrete next-week focus.
5. Do NOT mention team, coach, team goals, teammates, or rankings.
6. Reflect the parent's chosen focus areas if provided.
7. Use simple, parent-friendly language.
8. Do NOT include medical advice or injury-related comments.`;

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

  const requestId = crypto.randomUUID();

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    // ── Input validation ──
    const body = await req.json();
    const { player_id, week_start } = body;

    if (
      !player_id ||
      typeof player_id !== "string" ||
      !week_start ||
      typeof week_start !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(week_start)
    ) {
      return jsonResp(
        { error: "player_id (uuid) and week_start (YYYY-MM-DD) are required" },
        400
      );
    }

    const weekStartDate = new Date(week_start + "T00:00:00Z");
    if (isNaN(weekStartDate.getTime())) {
      return jsonResp({ error: "Invalid week_start date" }, 400);
    }

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
    const weekEnd = weekEndDate.toISOString().split("T")[0];

    const log = (msg: string, extra?: Record<string, unknown>) =>
      console.log(
        JSON.stringify({
          request_id: requestId,
          user_id: userId,
          player_id,
          week_start,
          msg,
          ...extra,
        })
      );

    log("started");

    // ── Service role client for data ──
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Verify guardian/owner ──
    const { data: player } = await supabase
      .from("players")
      .select("id, first_name, owner_user_id")
      .eq("id", player_id)
      .single();

    if (!player) {
      return jsonResp({ error: "Player not found" }, 404);
    }

    const isOwner = player.owner_user_id === userId;
    let isGuardian = false;
    if (!isOwner) {
      const { count } = await supabase
        .from("player_guardians")
        .select("*", { count: "exact", head: true })
        .eq("player_id", player_id)
        .eq("user_id", userId);
      isGuardian = (count ?? 0) > 0;
    }

    if (!isOwner && !isGuardian) {
      log("rejected: not owner or guardian");
      return jsonResp({ error: "Not authorized for this player" }, 403);
    }

    // ── Entitlement gate (Pro-only: can_receive_ai_summary) ──
    const { data: entRow } = await supabase
      .from("entitlements")
      .select("can_receive_ai_summary")
      .eq("user_id", userId)
      .maybeSingle();

    if (!entRow?.can_receive_ai_summary) {
      return jsonResp(
        { error: "AI summaries require a Pro subscription" },
        403
      );
    }

    // ── Fetch parent-only practice cards ──
    const { data: practiceCards } = await supabase
      .from("practice_cards")
      .select("id, date, mode")
      .eq("program_source", "parent")
      .gte("date", week_start)
      .lte("date", weekEnd);

    // Also fetch personal practice cards (solo/parent-created)
    const { data: personalCards } = await supabase
      .from("personal_practice_cards")
      .select("id, date, title")
      .eq("player_id", player_id)
      .gte("date", week_start)
      .lte("date", weekEnd);

    // ── Session completions (parent program_source) ──
    const parentCardIds = practiceCards?.map((c) => c.id) || [];
    let parentSessionsComplete = 0;
    const parentSessionsTotal = parentCardIds.length;

    if (parentCardIds.length > 0) {
      const { data: sessions } = await supabase
        .from("session_completions")
        .select("status, practice_card_id")
        .eq("player_id", player_id)
        .eq("program_source", "parent")
        .in("practice_card_id", parentCardIds);

      parentSessionsComplete =
        sessions?.filter((s) => s.status === "complete").length ?? 0;
    }

    // ── Personal session completions ──
    const personalCardIds = personalCards?.map((c) => c.id) || [];
    let personalSessionsComplete = 0;
    const personalSessionsTotal = personalCardIds.length;

    if (personalCardIds.length > 0) {
      const { data: pSessions } = await supabase
        .from("personal_session_completions")
        .select("status, personal_practice_card_id")
        .eq("player_id", player_id)
        .in("personal_practice_card_id", personalCardIds);

      personalSessionsComplete =
        pSessions?.filter((s) => s.status === "complete").length ?? 0;
    }

    const workoutsCompleted = parentSessionsComplete + personalSessionsComplete;
    const workoutsScheduled = parentSessionsTotal + personalSessionsTotal;

    // ── Task completions for shots/reps/minutes ──
    let totalShots = 0;
    let totalStrengthReps = 0;
    let totalMinutes = 0;

    if (parentCardIds.length > 0) {
      const { data: taskComps } = await supabase
        .from("task_completions")
        .select(
          "shots_logged, practice_tasks!inner(practice_card_id, task_type, target_type, target_value)"
        )
        .eq("player_id", player_id)
        .eq("completed", true)
        .in("practice_tasks.practice_card_id", parentCardIds);

      for (const tc of taskComps || []) {
        const task = tc.practice_tasks as any;
        totalShots += tc.shots_logged || 0;
        if (
          task?.task_type === "strength" ||
          task?.task_type === "conditioning"
        ) {
          if (task?.target_type === "reps")
            totalStrengthReps += task?.target_value || 0;
          if (task?.target_type === "minutes")
            totalMinutes += task?.target_value || 0;
        }
      }
    }

    // Personal task completions
    if (personalCardIds.length > 0) {
      const { data: pTaskComps } = await supabase
        .from("personal_task_completions")
        .select(
          "personal_practice_tasks!inner(personal_practice_card_id, task_type, shots_expected, target_type, target_value)"
        )
        .eq("player_id", player_id)
        .eq("completed", true)
        .in(
          "personal_practice_tasks.personal_practice_card_id",
          personalCardIds
        );

      for (const tc of pTaskComps || []) {
        const task = tc.personal_practice_tasks as any;
        totalShots += task?.shots_expected || 0;
        if (
          task?.task_type === "strength" ||
          task?.task_type === "conditioning"
        ) {
          if (task?.target_type === "reps")
            totalStrengthReps += task?.target_value || 0;
          if (task?.target_type === "minutes")
            totalMinutes += task?.target_value || 0;
        }
      }
    }

    const completionPct =
      workoutsScheduled > 0
        ? Math.round((workoutsCompleted / workoutsScheduled) * 100)
        : 0;

    // ── Streak calculation (parent-only) ──
    const { data: allPersonalSessions } = await supabase
      .from("personal_session_completions")
      .select("personal_practice_cards!inner(date)")
      .eq("player_id", player_id)
      .eq("status", "complete");

    const { data: allParentSessions } = await supabase
      .from("session_completions")
      .select("completed_at")
      .eq("player_id", player_id)
      .eq("program_source", "parent")
      .eq("status", "complete");

    const completedDatesSet = new Set<string>();
    for (const s of allPersonalSessions || []) {
      const card = s.personal_practice_cards as any;
      if (card?.date) completedDatesSet.add(card.date);
    }
    for (const s of allParentSessions || []) {
      if (s.completed_at) {
        completedDatesSet.add(s.completed_at.split("T")[0]);
      }
    }

    let bestStreak = 0;
    let streak = 0;
    let prevDate: Date | null = null;

    for (const dateStr of Array.from(completedDatesSet).sort()) {
      const d = new Date(dateStr + "T00:00:00Z");
      if (prevDate) {
        const diff =
          (d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak++;
        } else {
          streak = 1;
        }
      } else {
        streak = 1;
      }
      bestStreak = Math.max(bestStreak, streak);
      prevDate = d;
    }

    // Current streak: count back from today (allow 1-day gap)
    const today = new Date().toISOString().split("T")[0];
    let currentStreak = 0;
    let checkDate = new Date(today + "T00:00:00Z");
    while (completedDatesSet.has(checkDate.toISOString().split("T")[0])) {
      currentStreak++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }
    if (currentStreak === 0) {
      checkDate = new Date(today + "T00:00:00Z");
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      while (completedDatesSet.has(checkDate.toISOString().split("T")[0])) {
        currentStreak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      }
    }

    const stats = {
      workouts_completed: workoutsCompleted,
      workouts_scheduled: workoutsScheduled,
      completion_pct: completionPct,
      total_shots_logged: totalShots,
      total_strength_reps: totalStrengthReps,
      total_minutes: totalMinutes,
      current_parent_streak: currentStreak,
      best_parent_streak: bestStreak,
    };

    log("stats_computed", { stats });

    // ── Get focus areas ──
    const { data: plan } = await supabase
      .from("personal_training_plans")
      .select("training_focus")
      .eq("player_id", player_id)
      .eq("is_active", true)
      .maybeSingle();

    const focusAreas =
      plan?.training_focus?.join(", ") || "general development";

    // ── AI summary generation ──
    const prompt = `Generate a parent weekly summary for ${player.first_name}'s home development program:
- Workouts completed: ${workoutsCompleted} of ${workoutsScheduled} scheduled (${completionPct}%)
- Total shots logged: ${totalShots}
- Strength reps (pushups etc): ${totalStrengthReps}
- Conditioning minutes: ${totalMinutes}
- Current streak: ${currentStreak} days
- Best streak: ${bestStreak} days
- Focus areas: ${focusAreas}

Remember: 4-6 sentences. One specific win. One next-week suggestion. No team/coach references.`;

    let summaryText: string;
    try {
      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: prompt },
            ],
            temperature: 0.4,
          }),
        }
      );

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        log("ai_error", { ai_status: aiResponse.status, ai_body: errText });
        summaryText = `${player.first_name} completed ${workoutsCompleted} of ${workoutsScheduled} home workouts this week with ${totalShots} shots logged. ${currentStreak > 0 ? `Current streak: ${currentStreak} days — keep it going!` : "Let's build a streak next week!"}`;
      } else {
        const aiData = await aiResponse.json();
        summaryText =
          aiData.choices?.[0]?.message?.content?.trim() ||
          `${player.first_name} completed ${workoutsCompleted} home workouts this week. Keep up the effort!`;
      }
    } catch (aiErr) {
      log("ai_call_failed", {
        error: aiErr instanceof Error ? aiErr.message : String(aiErr),
      });
      summaryText = `${player.first_name} completed ${workoutsCompleted} of ${workoutsScheduled} home workouts this week with ${totalShots} shots logged. Keep building!`;
    }

    // ── Upsert into parent_week_summaries ──
    const { error: upsertError } = await supabase
      .from("parent_week_summaries")
      .upsert(
        {
          user_id: userId,
          player_id,
          week_start,
          week_end: weekEnd,
          summary_text: summaryText,
          stats,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,player_id,week_start" }
      );

    if (upsertError) {
      log("upsert_failed", { error: upsertError.message });
      return jsonResp(
        { error: "Failed to save summary. Please retry." },
        500
      );
    }

    log("completed");

    return jsonResp({
      success: true,
      player_id,
      week_start,
      week_end: weekEnd,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        request_id: requestId,
        msg: "unhandled_error",
        error: error instanceof Error ? error.message : String(error),
      })
    );
    return jsonResp(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
