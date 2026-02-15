import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PUBLISHED_URL = "https://thehockeyapp.lovable.app";

function jsonResp(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Dynamic subject line ──

function generateSubjectLine(summary: {
  total_shots: number;
  total_workouts: number;
  longest_streak: number;
}): string {
  // Pick the most interesting stat
  if (summary.longest_streak >= 5) {
    return `${summary.longest_streak}-day streak still alive.`;
  }
  if (summary.total_shots >= 100) {
    return `${summary.total_shots.toLocaleString()} shots this week.`;
  }
  if (summary.total_workouts >= 3) {
    return `${summary.total_workouts} workouts completed.`;
  }
  if (summary.total_shots > 0) {
    return `${summary.total_shots} shots logged this week.`;
  }
  if (summary.total_workouts > 0) {
    return `${summary.total_workouts} workout${summary.total_workouts === 1 ? "" : "s"} this week.`;
  }
  return "Consistency is building.";
}

// ── Email HTML builder ──

function buildEmailHtml(params: {
  totalShots: number;
  totalWorkouts: number;
  longestStreak: number;
  focusAreas: string[];
  aiSummary: string;
  isPro: boolean;
  showMomentumBlock: boolean;
}): string {
  const { totalShots, totalWorkouts, longestStreak, focusAreas, aiSummary, isPro, showMomentumBlock } = params;

  const focusDisplay = focusAreas.length > 0 ? focusAreas.join(", ") : "General development";

  const ctaUrl = isPro
    ? `${PUBLISHED_URL}/players`
    : `${PUBLISHED_URL}/pricing`;
  const ctaLabel = isPro ? "Open Dashboard" : "Unlock Full Access";

  // ── Momentum upgrade block (FREE users only, conditional) ──
  const momentumBlockHtml = showMomentumBlock
    ? `
        <!-- Momentum Block -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
          <tr>
            <td style="background-color:#f8f8f8;border-radius:8px;padding:20px 24px;">
              <p style="font-size:14px;line-height:1.6;color:#555555;margin:0;">
                You're building real consistency. Unlock full-season tracking and structured development plans.
              </p>
              <a href="${PUBLISHED_URL}/pricing" style="display:inline-block;margin-top:12px;font-size:13px;font-weight:600;color:#1a1a1a;text-decoration:underline;">
                Learn more
              </a>
            </td>
          </tr>
        </table>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Training Summary</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <tr>
      <td>
        <!-- Header -->
        <p style="font-size:13px;color:#888888;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px 0;">
          Weekly Report
        </p>
        <h1 style="font-size:22px;font-weight:600;margin:0 0 28px 0;color:#1a1a1a;">
          This week in your home training
        </h1>

        <!-- Divider -->
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:0 0 24px 0;">

        <!-- Metrics Grid -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td width="50%" style="padding:12px 8px 12px 0;vertical-align:top;">
              <p style="font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:0.3px;margin:0 0 4px 0;">Total Shots</p>
              <p style="font-size:28px;font-weight:700;margin:0;color:#1a1a1a;">${totalShots.toLocaleString()}</p>
            </td>
            <td width="50%" style="padding:12px 0 12px 8px;vertical-align:top;">
              <p style="font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:0.3px;margin:0 0 4px 0;">Workouts</p>
              <p style="font-size:28px;font-weight:700;margin:0;color:#1a1a1a;">${totalWorkouts}</p>
            </td>
          </tr>
          <tr>
            <td width="50%" style="padding:12px 8px 12px 0;vertical-align:top;">
              <p style="font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:0.3px;margin:0 0 4px 0;">Longest Streak</p>
              <p style="font-size:28px;font-weight:700;margin:0;color:#1a1a1a;">${longestStreak} day${longestStreak === 1 ? "" : "s"}</p>
            </td>
            <td width="50%" style="padding:12px 0 12px 8px;vertical-align:top;">
              <p style="font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:0.3px;margin:0 0 4px 0;">Focus Areas</p>
              <p style="font-size:14px;font-weight:500;margin:0;color:#1a1a1a;">${focusDisplay}</p>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:0 0 24px 0;">

        <!-- AI Summary -->
        <p style="font-size:15px;line-height:1.65;color:#333333;margin:0 0 28px 0;">
          ${aiSummary}
        </p>

        ${momentumBlockHtml}

        <!-- Divider -->
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:0 0 28px 0;">

        <!-- CTA -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <a href="${ctaUrl}" style="display:inline-block;padding:12px 32px;background-color:#1a1a1a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">
                ${ctaLabel}
              </a>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <p style="font-size:11px;color:#aaaaaa;text-align:center;margin:32px 0 0 0;line-height:1.5;">
          You are receiving this because you have an active home training program.<br>
          This summary reflects home practice only.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const runId = crypto.randomUUID();
  const log = (msg: string, extra?: Record<string, unknown>) =>
    console.log(JSON.stringify({ run_id: runId, fn: "send-parent-weekly-email", msg, ...extra }));

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Fetch unsent summaries ──
    const { data: unsent, error: fetchErr } = await supabase
      .from("parent_weekly_summaries")
      .select("*")
      .is("sent_at", null)
      .not("ai_summary", "is", null);

    if (fetchErr) {
      log("fetch_unsent_failed", { error: fetchErr.message });
      return jsonResp({ error: "Failed to fetch unsent summaries" }, 500);
    }

    if (!unsent || unsent.length === 0) {
      log("no_unsent_summaries");
      return jsonResp({ success: true, sent: 0, failed: 0 });
    }

    log("unsent_found", { count: unsent.length });

    let sent = 0;
    let failed = 0;

    for (const summary of unsent) {
      try {
        // Get parent's email from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, display_name")
          .eq("user_id", summary.user_id)
          .single();

        if (!profile?.email) {
          log("no_email_for_user", { user_id: summary.user_id });
          failed++;
          continue;
        }

        // Determine tier
        const { data: isPro } = await supabase.rpc("has_full_access", {
          p_user_id: summary.user_id,
        });
        const userIsPro = isPro === true;

        // ── Momentum block eligibility (FREE users only) ──
        let showMomentumBlock = false;
        if (!userIsPro) {
          // Condition 1: streak >= 14 days
          if (summary.longest_streak >= 14) {
            showMomentumBlock = true;
          }

          // Condition 2: 2+ consecutive weeks with summaries
          if (!showMomentumBlock) {
            const { count } = await supabase
              .from("parent_weekly_summaries")
              .select("id", { count: "exact", head: true })
              .eq("user_id", summary.user_id)
              .not("ai_summary", "is", null)
              .lt("week_start", summary.week_start)
              .order("week_start", { ascending: false })
              .limit(1);

            // If there's at least 1 prior summary, that's 2+ consecutive weeks
            if ((count ?? 0) >= 1) {
              showMomentumBlock = true;
            }
          }

          log("momentum_check", {
            user_id: summary.user_id,
            showMomentumBlock,
            streak: summary.longest_streak,
          });
        }

        // Build email
        const subject = generateSubjectLine({
          total_shots: summary.total_shots,
          total_workouts: summary.total_workouts,
          longest_streak: summary.longest_streak,
        });

        const html = buildEmailHtml({
          totalShots: summary.total_shots,
          totalWorkouts: summary.total_workouts,
          longestStreak: summary.longest_streak,
          focusAreas: summary.focus_areas || [],
          aiSummary: summary.ai_summary || "",
          isPro: userIsPro,
          showMomentumBlock,
        });

        // Send via Resend
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "The Hockey App <weekly@thehockeyapp.lovable.app>",
            to: [profile.email],
            subject,
            html,
          }),
        });

        if (!resendRes.ok) {
          const errBody = await resendRes.text();
          log("resend_failed", {
            user_id: summary.user_id,
            status: resendRes.status,
            body: errBody,
          });
          failed++;
          continue;
        }

        const resendData = await resendRes.json();

        // Mark as sent (idempotent guard)
        const { error: updateErr } = await supabase
          .from("parent_weekly_summaries")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", summary.id)
          .is("sent_at", null); // Only update if still null (race protection)

        if (updateErr) {
          log("update_sent_at_failed", { id: summary.id, error: updateErr.message });
        }

        sent++;
        log("email_sent", {
          user_id: summary.user_id,
          resend_id: resendData.id,
          subject,
        });
      } catch (userErr) {
        log("user_email_failed", {
          user_id: summary.user_id,
          error: userErr instanceof Error ? userErr.message : String(userErr),
        });
        failed++;
      }
    }

    log("completed", { sent, failed });
    return jsonResp({ success: true, sent, failed });
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
