import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Prompt templates (tier-specific) ──

const SYSTEM_PROMPT_FREE = `You write calm, short weekly reflections for a parent managing their child's at-home hockey development.

RULES:
1. 60–90 words maximum.
2. Calm, measured tone. No hype. No emojis. No exclamation marks.
3. Focus on effort, discipline, and consistency — not outcomes or talent.
4. Call out one honest observation from the data.
5. Do NOT suggest drills, plans, or structured next steps.
6. Do NOT compare to other players, teams, or benchmarks.
7. Do NOT mention team, coach, teammates, or rankings.
8. Do NOT include medical advice.
9. Write as a reflection, not a coaching plan.`;

const SYSTEM_PROMPT_PRO = `You write calm, short weekly reflections for a parent managing their child's at-home hockey development. This parent has a Pro subscription and benefits from light guidance.

RULES:
1. 60–90 words maximum.
2. Calm, measured tone. No hype. No emojis. No exclamation marks.
3. Focus on effort, discipline, and consistency — not outcomes or talent.
4. Call out one honest observation from the data.
5. Add exactly ONE short next-week suggestion (balancing skill focus or adjusting volume).
6. Suggest a specific, modest volume target if appropriate.
7. Do NOT compare to other players, teams, or benchmarks.
8. Do NOT mention team, coach, teammates, or rankings.
9. Do NOT include medical advice.`;

function jsonResp(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getMondayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - diff);
  return monday.toISOString().split("T")[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const runId = crypto.randomUUID();
  const log = (msg: string, extra?: Record<string, unknown>) =>
    console.log(JSON.stringify({ run_id: runId, fn: "generate-parent-weekly-summaries", msg, ...extra }));

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Determine week_start (previous Monday) ──
    // Accept override from body for testing, else auto-compute
    let weekStart: string;
    try {
      const body = await req.json();
      weekStart = body?.week_start || getMondayOfCurrentWeek();
    } catch {
      weekStart = getMondayOfCurrentWeek();
    }

    const weekStartDate = new Date(weekStart + "T00:00:00Z");
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
    const weekEnd = weekEndDate.toISOString().split("T")[0];

    log("started", { week_start: weekStart, week_end: weekEnd });

    // ── Fetch eligible parents via RPC ──
    const { data: eligibleParents, error: eligError } = await supabase.rpc(
      "get_parents_eligible_for_weekly_summary",
      { p_week_start: weekStart }
    );

    if (eligError) {
      log("eligibility_rpc_failed", { error: eligError.message });
      return jsonResp({ error: "Failed to fetch eligible parents" }, 500);
    }

    if (!eligibleParents || eligibleParents.length === 0) {
      log("no_eligible_parents");
      return jsonResp({ success: true, processed: 0, skipped: 0 });
    }

    log("eligible_parents_found", { count: eligibleParents.length });

    // ── Dedup: find parents who already have a summary this week ──
    const parentUserIds = eligibleParents.map((p: { user_id: string }) => p.user_id);

    const { data: existingSummaries } = await supabase
      .from("parent_weekly_summaries")
      .select("user_id")
      .eq("week_start", weekStart)
      .in("user_id", parentUserIds);

    const alreadyGenerated = new Set(
      (existingSummaries || []).map((s: { user_id: string }) => s.user_id)
    );

    const parentsToProcess = parentUserIds.filter(
      (uid: string) => !alreadyGenerated.has(uid)
    );

    log("dedup_complete", {
      total_eligible: parentUserIds.length,
      already_generated: alreadyGenerated.size,
      to_process: parentsToProcess.length,
    });

    let processed = 0;
    let failed = 0;

    for (const userId of parentsToProcess) {
      try {
        // ── Get metrics via RPC (using service role, impersonating) ──
        // Since the RPC checks auth.uid(), we call it directly with service role
        // and pass the user_id. But the RPC requires auth.uid() = p_user_id.
        // For cron context, we query the data directly instead.

        const metrics = await fetchParentMetrics(supabase, userId, weekStart, weekEnd);

        // ── Determine tier (Free vs Pro) ──
        const { data: accessRow } = await supabase.rpc("has_full_access", {
          p_user_id: userId,
        });
        const isPro = accessRow === true;

        // ── Build prompt ──
        const systemPrompt = isPro ? SYSTEM_PROMPT_PRO : SYSTEM_PROMPT_FREE;

        const focusLabel = metrics.focus_areas.length > 0
          ? metrics.focus_areas.join(", ")
          : "general development";

        const userPrompt = `Weekly reflection for a parent's home hockey program:
- Workouts completed: ${metrics.total_workouts}
- Total shots logged: ${metrics.total_shots}
- Strength/conditioning reps: ${metrics.total_pushups}
- Longest streak this period: ${metrics.longest_streak} days
- Active training plan: ${metrics.program_active ? "yes" : "no"}
- Focus areas: ${focusLabel}

Write a calm, measured weekly reflection. ${isPro ? "Include one modest next-week suggestion." : "Reflection only, no suggestions."}`;

        // ── AI call ──
        let aiSummary: string;
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
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                temperature: 0.3,
              }),
            }
          );

          if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            log("ai_error", { user_id: userId, status: aiResponse.status, body: errText });
            aiSummary = buildFallbackSummary(metrics);
          } else {
            const aiData = await aiResponse.json();
            aiSummary =
              aiData.choices?.[0]?.message?.content?.trim() ||
              buildFallbackSummary(metrics);
          }
        } catch (aiErr) {
          log("ai_call_failed", {
            user_id: userId,
            error: aiErr instanceof Error ? aiErr.message : String(aiErr),
          });
          aiSummary = buildFallbackSummary(metrics);
        }

        // ── Insert into parent_weekly_summaries ──
        const { error: insertError } = await supabase
          .from("parent_weekly_summaries")
          .insert({
            user_id: userId,
            week_start: weekStart,
            week_end: weekEnd,
            total_shots: metrics.total_shots,
            total_pushups: metrics.total_pushups,
            total_workouts: metrics.total_workouts,
            longest_streak: metrics.longest_streak,
            focus_areas: metrics.focus_areas,
            program_active: metrics.program_active,
            ai_summary: aiSummary,
            summary_version: "v1",
          });

        if (insertError) {
          // Could be a unique constraint violation from a race condition — skip
          if (insertError.code === "23505") {
            log("duplicate_skipped", { user_id: userId });
          } else {
            log("insert_failed", { user_id: userId, error: insertError.message });
            failed++;
          }
          continue;
        }

        processed++;
        log("summary_generated", { user_id: userId, is_pro: isPro });
      } catch (userErr) {
        log("user_processing_failed", {
          user_id: userId,
          error: userErr instanceof Error ? userErr.message : String(userErr),
        });
        failed++;
      }
    }

    log("completed", { processed, failed, skipped: alreadyGenerated.size });

    return jsonResp({
      success: true,
      processed,
      failed,
      skipped: alreadyGenerated.size,
      week_start: weekStart,
      week_end: weekEnd,
    });
  } catch (error) {
    log("unhandled_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResp(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// ── Helper: fetch metrics directly (bypasses RPC auth check for cron context) ──

interface ParentMetrics {
  total_shots: number;
  total_pushups: number;
  total_workouts: number;
  longest_streak: number;
  focus_areas: string[];
  program_active: boolean;
}

async function fetchParentMetrics(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<ParentMetrics> {
  // Get all player IDs for this parent
  const { data: ownedPlayers } = await supabase
    .from("players")
    .select("id")
    .eq("owner_user_id", userId);

  const { data: guardedPlayers } = await supabase
    .from("player_guardians")
    .select("player_id")
    .eq("user_id", userId);

  const playerIds = [
    ...new Set([
      ...(ownedPlayers?.map((p) => p.id) || []),
      ...(guardedPlayers?.map((g) => g.player_id) || []),
    ]),
  ];

  if (playerIds.length === 0) {
    return {
      total_shots: 0,
      total_pushups: 0,
      total_workouts: 0,
      longest_streak: 0,
      focus_areas: [],
      program_active: false,
    };
  }

  // Workouts (parent program_source)
  const { count: parentWorkouts } = await supabase
    .from("session_completions")
    .select("id", { count: "exact", head: true })
    .in("player_id", playerIds)
    .eq("program_source", "parent")
    .eq("status", "complete");

  // Personal workouts in date range
  const { data: personalCards } = await supabase
    .from("personal_practice_cards")
    .select("id")
    .in("player_id", playerIds)
    .gte("date", weekStart)
    .lte("date", weekEnd);

  const personalCardIds = personalCards?.map((c) => c.id) || [];
  let personalWorkouts = 0;
  if (personalCardIds.length > 0) {
    const { count } = await supabase
      .from("personal_session_completions")
      .select("id", { count: "exact", head: true })
      .in("player_id", playerIds)
      .eq("status", "complete")
      .in("personal_practice_card_id", personalCardIds);
    personalWorkouts = count ?? 0;
  }

  // Parent practice cards in date range
  const { data: parentCards } = await supabase
    .from("practice_cards")
    .select("id")
    .eq("program_source", "parent")
    .gte("date", weekStart)
    .lte("date", weekEnd);

  const parentCardIds = parentCards?.map((c) => c.id) || [];

  // Shots
  let totalShots = 0;
  if (parentCardIds.length > 0) {
    const { data: taskComps } = await supabase
      .from("task_completions")
      .select("shots_logged, practice_tasks!inner(practice_card_id)")
      .in("player_id", playerIds)
      .eq("completed", true)
      .in("practice_tasks.practice_card_id", parentCardIds);

    totalShots = (taskComps || []).reduce(
      (sum, tc) => sum + (tc.shots_logged || 0),
      0
    );
  }

  // Personal shots
  if (personalCardIds.length > 0) {
    const { data: pTaskComps } = await supabase
      .from("personal_task_completions")
      .select(
        "personal_practice_tasks!inner(personal_practice_card_id, shots_expected)"
      )
      .in("player_id", playerIds)
      .eq("completed", true)
      .in("personal_practice_tasks.personal_practice_card_id", personalCardIds);

    totalShots += (pTaskComps || []).reduce((sum, tc) => {
      const task = tc.personal_practice_tasks as any;
      return sum + (task?.shots_expected || 0);
    }, 0);
  }

  // Strength reps (pushups)
  let totalPushups = 0;
  if (parentCardIds.length > 0) {
    const { data: strengthComps } = await supabase
      .from("task_completions")
      .select(
        "practice_tasks!inner(practice_card_id, task_type, target_type, target_value)"
      )
      .in("player_id", playerIds)
      .eq("completed", true)
      .in("practice_tasks.practice_card_id", parentCardIds);

    totalPushups = (strengthComps || []).reduce((sum, tc) => {
      const task = tc.practice_tasks as any;
      if (task?.task_type === "strength" && task?.target_type === "reps") {
        return sum + (task?.target_value || 0);
      }
      return sum;
    }, 0);
  }

  if (personalCardIds.length > 0) {
    const { data: pStrengthComps } = await supabase
      .from("personal_task_completions")
      .select(
        "personal_practice_tasks!inner(personal_practice_card_id, task_type, target_type, target_value)"
      )
      .in("player_id", playerIds)
      .eq("completed", true)
      .in("personal_practice_tasks.personal_practice_card_id", personalCardIds);

    totalPushups += (pStrengthComps || []).reduce((sum, tc) => {
      const task = tc.personal_practice_tasks as any;
      if (task?.task_type === "strength" && task?.target_type === "reps") {
        return sum + (task?.target_value || 0);
      }
      return sum;
    }, 0);
  }

  // Streak (gap-and-island across all children, parent-only)
  const { data: parentSessions } = await supabase
    .from("session_completions")
    .select("completed_at")
    .in("player_id", playerIds)
    .eq("program_source", "parent")
    .eq("status", "complete");

  const { data: personalSessions } = await supabase
    .from("personal_session_completions")
    .select("personal_practice_cards!inner(date)")
    .in("player_id", playerIds)
    .eq("status", "complete");

  const completedDates = new Set<string>();
  for (const s of parentSessions || []) {
    if (s.completed_at) completedDates.add(s.completed_at.split("T")[0]);
  }
  for (const s of personalSessions || []) {
    const card = s.personal_practice_cards as any;
    if (card?.date) completedDates.add(card.date);
  }

  let longestStreak = 0;
  let streak = 0;
  let prevDate: Date | null = null;
  for (const dateStr of Array.from(completedDates).sort()) {
    const d = new Date(dateStr + "T00:00:00Z");
    if (prevDate) {
      const diff =
        (d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      streak = diff === 1 ? streak + 1 : 1;
    } else {
      streak = 1;
    }
    longestStreak = Math.max(longestStreak, streak);
    prevDate = d;
  }

  // Focus areas
  const { data: plans } = await supabase
    .from("personal_training_plans")
    .select("training_focus, is_active")
    .in("player_id", playerIds)
    .eq("is_active", true);

  const focusSet = new Set<string>();
  for (const plan of plans || []) {
    for (const focus of plan.training_focus || []) {
      focusSet.add(focus);
    }
  }

  // Program active
  const programActive = (plans?.length ?? 0) > 0;

  return {
    total_shots: totalShots,
    total_pushups: totalPushups,
    total_workouts: (parentWorkouts ?? 0) + personalWorkouts,
    longest_streak: longestStreak,
    focus_areas: Array.from(focusSet),
    program_active: programActive,
  };
}

function buildFallbackSummary(metrics: ParentMetrics): string {
  const parts: string[] = [];
  if (metrics.total_workouts > 0) {
    parts.push(
      `${metrics.total_workouts} home workout${metrics.total_workouts === 1 ? "" : "s"} completed this week`
    );
  }
  if (metrics.total_shots > 0) {
    parts.push(`${metrics.total_shots} shots logged`);
  }
  if (metrics.longest_streak > 1) {
    parts.push(`${metrics.longest_streak}-day streak maintained`);
  }
  if (parts.length === 0) {
    return "A quieter week on the home program. Consistency builds over time, and every week is a chance to reset.";
  }
  return (
    parts.join(". ") +
    ". Steady effort over time is what builds real development."
  );
}
