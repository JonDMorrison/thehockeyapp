import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const runId = crypto.randomUUID();
  const log = (msg: string, extra?: Record<string, unknown>) =>
    console.log(JSON.stringify({ run_id: runId, fn: "compute-team-adoption-milestones", msg, ...extra }));

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all teams
    const { data: teams, error: teamsErr } = await supabase
      .from("teams")
      .select("id, name");

    if (teamsErr || !teams) {
      log("fetch_teams_failed", { error: teamsErr?.message });
      return new Response(JSON.stringify({ error: "Failed to fetch teams" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    let milestonesLogged = 0;

    for (const team of teams) {
      // Dedupe: skip if milestone logged for this team in last 14 days
      const { count: recentMilestones } = await supabase
        .from("admin_activity_log")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "team_adoption_milestone")
        .eq("team_id", team.id)
        .gte("created_at", fourteenDaysAgo);

      if ((recentMilestones ?? 0) > 0) continue;

      // Check thresholds
      // 1. Active players (>=10)
      const { count: activePlayers } = await supabase
        .from("team_memberships")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id)
        .eq("status", "active");

      // 2. Checkoffs in last 7 days (>=50)
      const { count: recentCheckoffs } = await supabase
        .from("task_completions")
        .select("id", { count: "exact", head: true })
        .eq("completed", true)
        .gte("completed_at", sevenDaysAgo)
        .in(
          "practice_task_id",
          // Subquery: tasks belonging to this team's practice cards
          (await supabase
            .from("practice_tasks")
            .select("id")
            .in(
              "practice_card_id",
              (await supabase
                .from("practice_cards")
                .select("id")
                .eq("team_id", team.id)
              ).data?.map(c => c.id) || []
            )
          ).data?.map(t => t.id) || []
        );

      // 3. Players with 7+ day streaks (>=3) — simplified: check session_completions count >= 7 in last 7 days per player
      const { data: teamPlayerIds } = await supabase
        .from("team_memberships")
        .select("player_id")
        .eq("team_id", team.id)
        .eq("status", "active");

      let streak7Count = 0;
      if (teamPlayerIds && teamPlayerIds.length > 0) {
        for (const tp of teamPlayerIds) {
          const { count: sessionDays } = await supabase
            .from("session_completions")
            .select("id", { count: "exact", head: true })
            .eq("player_id", tp.player_id)
            .eq("status", "complete")
            .gte("completed_at", sevenDaysAgo);

          if ((sessionDays ?? 0) >= 7) streak7Count++;
        }
      }

      const playerCount = activePlayers ?? 0;
      const checkoffCount = recentCheckoffs ?? 0;
      const meetsThreshold =
        playerCount >= 10 || checkoffCount >= 50 || streak7Count >= 3;

      if (meetsThreshold) {
        const reasons: string[] = [];
        if (playerCount >= 10) reasons.push(`${playerCount} active players`);
        if (checkoffCount >= 50) reasons.push(`${checkoffCount} checkoffs in 7d`);
        if (streak7Count >= 3) reasons.push(`${streak7Count} players with 7d streak`);

        await supabase.rpc("log_admin_event", {
          p_event_type: "team_adoption_milestone",
          p_severity: "important",
          p_actor: null,
          p_team: team.id,
          p_player: null,
          p_email: null,
          p_metadata: {
            team_name: team.name,
            active_players: playerCount,
            checkoffs_7d: checkoffCount,
            streak_7_players: streak7Count,
            reasons,
          },
        });

        milestonesLogged++;
        log("milestone_logged", { team_id: team.id, team_name: team.name, reasons });
      }
    }

    log("completed", { teams_checked: teams.length, milestones_logged: milestonesLogged });

    return new Response(JSON.stringify({ success: true, teams_checked: teams.length, milestones_logged: milestonesLogged }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("error", { error: err instanceof Error ? err.message : String(err) });
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});