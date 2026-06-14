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

interface DigestPlayer {
  name: string;
  sessions: number;
  streak: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const log = (msg: string, extra?: Record<string, unknown>) =>
    console.log(JSON.stringify({ fn: "weekly-digest-cron", msg, ...extra }));

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

    const { data: teams, error: teamsErr } = await supabase
      .from("teams")
      .select("id, name");

    if (teamsErr) {
      log("teams_fetch_failed", { error: teamsErr.message });
      return jsonResp({ error: "Failed to fetch teams" }, 500);
    }

    let teamsProcessed = 0;
    let sent = 0;
    let failed = 0;

    for (const team of teams ?? []) {
      teamsProcessed++;
      try {
        // ── Resolve head coach email ──
        const { data: roleRow, error: roleErr } = await supabase
          .from("team_roles")
          .select("user_id")
          .eq("team_id", team.id)
          .eq("role", "head_coach")
          .limit(1)
          .maybeSingle();

        if (roleErr) {
          log("role_fetch_failed", { team_id: team.id, error: roleErr.message });
          failed++;
          continue;
        }

        if (!roleRow?.user_id) {
          log("no_head_coach", { team_id: team.id });
          continue;
        }

        const { data: coachProfile, error: profileErr } = await supabase
          .from("profiles")
          .select("email, display_name")
          .eq("user_id", roleRow.user_id)
          .maybeSingle();

        if (profileErr) {
          log("coach_profile_fetch_failed", {
            team_id: team.id,
            error: profileErr.message,
          });
          failed++;
          continue;
        }

        const coachEmail = coachProfile?.email;
        if (!coachEmail) {
          log("no_coach_email", { team_id: team.id });
          continue;
        }

        // ── Roster (match get_season_report: NULL/non-'removed' is on-roster) ──
        const { data: memberships, error: membershipsErr } = await supabase
          .from("team_memberships")
          .select("player_id, players(id, first_name)")
          .eq("team_id", team.id)
          .neq("status", "removed");

        if (membershipsErr) {
          log("roster_fetch_failed", {
            team_id: team.id,
            error: membershipsErr.message,
          });
          failed++;
          continue;
        }

        const roster = (memberships ?? [])
          .map((m) => m.players as { id: string; first_name: string } | null)
          .filter((p): p is { id: string; first_name: string } => !!p);

        const rosterCount = roster.length;

        // ── Per-player sessions + streak ──
        const players: DigestPlayer[] = [];
        for (const p of roster) {
          let sessions = 0;
          const { count, error: sessionsErr } = await supabase
            .from("session_completions")
            .select("id", { count: "exact", head: true })
            .eq("player_id", p.id)
            .eq("status", "complete")
            .gte("completed_at", weekAgo);
          if (sessionsErr) {
            log("sessions_count_failed", {
              team_id: team.id,
              player_id: p.id,
              error: sessionsErr.message,
            });
            sessions = 0;
          } else {
            sessions = count ?? 0;
          }

          let streak = 0;
          const { data: streakData, error: streakErr } = await supabase.rpc(
            "calculate_solo_streak",
            { p_player_id: p.id },
          );
          if (streakErr) {
            log("streak_calc_failed", {
              team_id: team.id,
              player_id: p.id,
              error: streakErr.message,
            });
            streak = 0;
          } else {
            streak = typeof streakData === "number" ? streakData : 0;
          }

          players.push({ name: p.first_name, sessions, streak });
        }

        const completedCount = players.filter((p) => p.sessions > 0).length;

        const teamProgressUrl = `https://www.hockeyapp.ca/teams/${team.id}/progress`;

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
              type: "weekly_coach_digest",
              to: coachEmail,
              data: {
                teamName: team.name,
                completedCount,
                rosterCount,
                players,
                teamProgressUrl,
              },
            }),
          },
        );

        if (!emailRes.ok) {
          const body = await emailRes.text();
          log("send_failed", { team_id: team.id, status: emailRes.status, body });
          failed++;
          continue;
        }

        sent++;
        log("team_digest_sent", { team_id: team.id, completedCount, rosterCount });
      } catch (teamErr) {
        log("team_error", {
          team_id: team.id,
          error: teamErr instanceof Error ? teamErr.message : String(teamErr),
        });
        failed++;
      }
    }

    log("completed", { teamsProcessed, sent, failed });
    return jsonResp({ success: true, teamsProcessed, sent, failed });
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
