import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are generating weekly training summaries for youth hockey players. These summaries are for parents and coaches to read - not for kids directly.

CRITICAL RULES:
1. Be positive, encouraging, and neutral in tone
2. Do NOT compare players to each other
3. Do NOT include rankings or judgments about performance quality
4. Focus on facts: sessions completed, shots logged, consistency
5. Keep summaries brief (2-3 sentences)
6. Use encouraging language without being over-the-top
7. Never mention specific technique issues or corrections
8. Do NOT include medical advice or injury-related comments

Good example: "Great week of training! 4 sessions completed with 200+ shots logged. Keep up the consistent effort!"

Bad example: "Better than last week but still needs work on wrist shot technique. Ranking 3rd on the team."`;

interface SummaryRequest {
  team_id: string;
  week_start: string; // YYYY-MM-DD
}

interface PlayerStats {
  player_id: string;
  first_name: string;
  last_initial: string | null;
  sessions_completed: number;
  sessions_partial: number;
  total_shots: number;
  game_day_sessions: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use anon client for auth check
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SummaryRequest = await req.json();
    const { team_id, week_start } = body;

    // Verify user is team adult
    const { data: teamRole, error: roleError } = await supabaseAuth
      .from("team_roles")
      .select("role")
      .eq("team_id", team_id)
      .eq("user_id", user.id)
      .single();

    if (roleError || !teamRole) {
      return new Response(JSON.stringify({ error: "Not authorized for this team" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate week end
    const weekStartDate = new Date(week_start);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEnd = weekEndDate.toISOString().split("T")[0];

    console.log(`Generating summaries for team ${team_id}, week ${week_start} to ${weekEnd}`);

    // Get all players on the team
    const { data: memberships, error: membershipsError } = await supabase
      .from("team_memberships")
      .select(`
        player_id,
        players (
          id,
          first_name,
          last_initial
        )
      `)
      .eq("team_id", team_id)
      .eq("status", "active");

    if (membershipsError) {
      console.error("Error fetching memberships:", membershipsError);
      throw membershipsError;
    }

    if (!memberships || memberships.length === 0) {
      return new Response(JSON.stringify({ error: "No players found on this team" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get practice cards for the week
    const { data: practiceCards, error: cardsError } = await supabase
      .from("practice_cards")
      .select("id, mode, date")
      .eq("team_id", team_id)
      .gte("date", week_start)
      .lte("date", weekEnd)
      .not("published_at", "is", null);

    if (cardsError) {
      console.error("Error fetching practice cards:", cardsError);
      throw cardsError;
    }

    const practiceCardIds = practiceCards?.map(c => c.id) || [];
    const gameDayCardIds = practiceCards?.filter(c => c.mode === "game_day").map(c => c.id) || [];

    // Get session completions for all players
    const { data: sessionCompletions, error: sessionsError } = await supabase
      .from("session_completions")
      .select("player_id, practice_card_id, status")
      .in("practice_card_id", practiceCardIds);

    if (sessionsError) {
      console.error("Error fetching session completions:", sessionsError);
    }

    // Get task completions for shot counts
    const { data: taskCompletions, error: tasksError } = await supabase
      .from("task_completions")
      .select(`
        player_id,
        shots_logged,
        practice_tasks!inner (
          practice_card_id
        )
      `)
      .in("practice_tasks.practice_card_id", practiceCardIds);

    if (tasksError) {
      console.error("Error fetching task completions:", tasksError);
    }

    // Compile stats per player
    const playerStats: PlayerStats[] = memberships.map(m => {
      const player = m.players as any;
      const playerSessions = sessionCompletions?.filter(s => s.player_id === m.player_id) || [];
      const playerTasks = taskCompletions?.filter(t => t.player_id === m.player_id) || [];
      
      return {
        player_id: m.player_id,
        first_name: player?.first_name || "Unknown",
        last_initial: player?.last_initial || null,
        sessions_completed: playerSessions.filter(s => s.status === "complete").length,
        sessions_partial: playerSessions.filter(s => s.status === "partial").length,
        total_shots: playerTasks.reduce((sum, t) => sum + (t.shots_logged || 0), 0),
        game_day_sessions: playerSessions.filter(s => 
          gameDayCardIds.includes(s.practice_card_id) && s.status === "complete"
        ).length,
      };
    });

    // Generate player summaries
    const playerSummaries: { player_id: string; summary: string }[] = [];
    
    for (const stats of playerStats) {
      const prompt = `Generate a brief, encouraging weekly summary for a youth hockey player:
- Name: ${stats.first_name}
- Sessions completed: ${stats.sessions_completed} complete, ${stats.sessions_partial} partial
- Total shots logged: ${stats.total_shots}
- Game day prep sessions: ${stats.game_day_sessions}

Keep it to 2-3 sentences. Be positive and factual.`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        });

        if (!aiResponse.ok) {
          console.error(`AI error for player ${stats.player_id}:`, await aiResponse.text());
          playerSummaries.push({
            player_id: stats.player_id,
            summary: `This week: ${stats.sessions_completed} sessions completed, ${stats.total_shots} shots logged. Keep it up!`,
          });
          continue;
        }

        const aiData = await aiResponse.json();
        const summary = aiData.choices?.[0]?.message?.content?.trim() || 
          `This week: ${stats.sessions_completed} sessions completed, ${stats.total_shots} shots logged. Keep it up!`;

        playerSummaries.push({ player_id: stats.player_id, summary });
      } catch (error) {
        console.error(`Error generating summary for player ${stats.player_id}:`, error);
        playerSummaries.push({
          player_id: stats.player_id,
          summary: `This week: ${stats.sessions_completed} sessions completed, ${stats.total_shots} shots logged. Keep it up!`,
        });
      }
    }

    // Generate team summary
    const totalSessions = playerStats.reduce((sum, p) => sum + p.sessions_completed, 0);
    const totalShots = playerStats.reduce((sum, p) => sum + p.total_shots, 0);
    const avgSessions = playerStats.length > 0 ? (totalSessions / playerStats.length).toFixed(1) : 0;
    const activePlayers = playerStats.filter(p => p.sessions_completed > 0).length;

    const teamPrompt = `Generate a brief team weekly summary for coaches:
- Total players: ${playerStats.length}
- Players who trained: ${activePlayers}
- Total sessions completed across team: ${totalSessions}
- Average sessions per player: ${avgSessions}
- Total shots logged by team: ${totalShots}

Keep it to 2-3 sentences. Focus on team participation and effort.`;

    let teamSummary: string;
    try {
      const teamAiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: teamPrompt },
          ],
          temperature: 0.4,
        }),
      });

      if (!teamAiResponse.ok) {
        teamSummary = `${activePlayers} of ${playerStats.length} players trained this week. ${totalSessions} sessions completed with ${totalShots} total shots logged.`;
      } else {
        const teamAiData = await teamAiResponse.json();
        teamSummary = teamAiData.choices?.[0]?.message?.content?.trim() || 
          `${activePlayers} of ${playerStats.length} players trained this week. ${totalSessions} sessions completed with ${totalShots} total shots logged.`;
      }
    } catch (error) {
      console.error("Error generating team summary:", error);
      teamSummary = `${activePlayers} of ${playerStats.length} players trained this week. ${totalSessions} sessions completed with ${totalShots} total shots logged.`;
    }

    // Save player summaries
    for (const ps of playerSummaries) {
      const { error: upsertError } = await supabase
        .from("player_week_summaries")
        .upsert({
          player_id: ps.player_id,
          team_id,
          week_start,
          summary_text: ps.summary,
          created_by_user_id: user.id,
        }, {
          onConflict: "player_id,team_id,week_start",
        });

      if (upsertError) {
        console.error(`Error saving summary for player ${ps.player_id}:`, upsertError);
      }
    }

    // Save team summary
    const { error: teamUpsertError } = await supabase
      .from("team_week_summaries")
      .upsert({
        team_id,
        week_start,
        summary_text: teamSummary,
        created_by_user_id: user.id,
      }, {
        onConflict: "team_id,week_start",
      });

    if (teamUpsertError) {
      console.error("Error saving team summary:", teamUpsertError);
    }

    // Store generation record
    await supabaseAuth.from("ai_generations").insert({
      team_id,
      created_by_user_id: user.id,
      generation_type: "summary_team",
      input_json: { week_start, player_count: playerStats.length },
      output_json: { team_summary: teamSummary, player_summaries: playerSummaries.length },
      status: "accepted",
    });

    return new Response(JSON.stringify({
      success: true,
      team_summary: teamSummary,
      player_summaries: playerSummaries,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-summaries-ai:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
