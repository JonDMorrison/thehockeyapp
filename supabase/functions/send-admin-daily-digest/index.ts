import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "jon@getclear.ca";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const runId = crypto.randomUUID();
  const log = (msg: string, extra?: Record<string, unknown>) =>
    console.log(JSON.stringify({ run_id: runId, fn: "send-admin-daily-digest", msg, ...extra }));

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Digest date = yesterday (Pacific time), but we look at last 24h UTC
    const now = new Date();
    const digestDate = now.toISOString().split("T")[0]; // today's date as key

    // Idempotency: check if digest already sent for this date
    const { data: existingRun } = await supabase
      .from("admin_digest_runs")
      .select("id")
      .eq("digest_date", digestDate)
      .maybeSingle();

    if (existingRun) {
      log("already_sent", { digestDate });
      return new Response(JSON.stringify({ success: true, already_sent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull last 24h events
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: events, error: eventsErr } = await supabase
      .from("admin_activity_log")
      .select("*")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

    if (eventsErr) {
      log("fetch_events_failed", { error: eventsErr.message });
      return new Response(JSON.stringify({ error: "Failed to fetch events" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allEvents = events || [];
    log("events_found", { count: allEvents.length });

    // Aggregate stats
    const counts: Record<string, number> = {};
    for (const e of allEvents) {
      counts[e.event_type] = (counts[e.event_type] || 0) + 1;
    }

    const signupCoach = counts["new_signup_coach"] || 0;
    const signupParent = counts["new_signup_parent"] || 0;
    const trialsStarted = counts["parent_trial_started"] || 0;
    const trialsConverted = counts["parent_trial_converted"] || 0;
    const teamPlansPurchased = counts["team_plan_purchased"] || 0;
    const paymentFailed = counts["invoice_payment_failed"] || 0;
    const persistenceFailed = counts["stripe_webhook_persistence_failed"] || 0;
    const milestones = counts["team_adoption_milestone"] || 0;
    const joinTeam = counts["join_team_completed"] || 0;

    // Weekly summary send stats (from metrics table)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data: sendMetrics } = await supabase
      .from("parent_weekly_summary_metrics")
      .select("metric_value")
      .eq("metric_name", "weekly_summary_sent_count")
      .gte("metric_date", weekAgo);

    const totalSummariesSent = (sendMetrics || []).reduce((acc, m) => acc + (m.metric_value as number), 0);

    // Build digest email
    const urgentEvents = allEvents.filter(e => e.severity === "urgent");
    const importantEvents = allEvents.filter(e => e.severity === "important");

    const urgentSection = urgentEvents.length > 0
      ? `<h3 style="color:#dc2626;margin:16px 0 8px;">🚨 Urgent Events (${urgentEvents.length})</h3>
         <ul style="margin:0;padding:0 0 0 20px;">
           ${urgentEvents.map(e => `<li style="font-size:13px;margin:4px 0;">${e.event_type.replace(/_/g, " ")} — ${e.email || e.actor_user_id || "system"} — ${new Date(e.created_at).toLocaleString("en-US", { timeZone: "America/Vancouver", hour: "numeric", minute: "2-digit" })}</li>`).join("")}
         </ul>`
      : "";

    const importantSection = importantEvents.length > 0
      ? `<h3 style="color:#d97706;margin:16px 0 8px;">⚠️ Important (${importantEvents.length})</h3>
         <ul style="margin:0;padding:0 0 0 20px;">
           ${importantEvents.map(e => `<li style="font-size:13px;margin:4px 0;">${e.event_type.replace(/_/g, " ")} — ${JSON.stringify(e.metadata || {}).slice(0, 100)}</li>`).join("")}
         </ul>`
      : "";

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <p style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Daily Admin Digest</p>
  <h1 style="font-size:20px;margin:0 0 4px;">Hockey App — ${digestDate}</h1>
  <p style="font-size:13px;color:#888;margin:0 0 24px;">Last 24 hours · ${allEvents.length} total events</p>

  <hr style="border:none;border-top:1px solid #e5e5e5;margin:0 0 20px;">

  <!-- Key Metrics -->
  <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#888;">New Signups (Parent)</td>
      <td style="padding:8px 0;font-size:15px;font-weight:600;text-align:right;">${signupParent}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#888;">New Signups (Coach)</td>
      <td style="padding:8px 0;font-size:15px;font-weight:600;text-align:right;">${signupCoach}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#888;">Trials Started</td>
      <td style="padding:8px 0;font-size:15px;font-weight:600;text-align:right;">${trialsStarted}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#888;">Trial Conversions</td>
      <td style="padding:8px 0;font-size:15px;font-weight:600;text-align:right;">${trialsConverted}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#888;">Team Plans Purchased</td>
      <td style="padding:8px 0;font-size:15px;font-weight:600;text-align:right;">${teamPlansPurchased}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#888;">Payment Failures</td>
      <td style="padding:8px 0;font-size:15px;font-weight:600;text-align:right;${paymentFailed > 0 ? "color:#dc2626;" : ""}">${paymentFailed}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#888;">Team Joins</td>
      <td style="padding:8px 0;font-size:15px;font-weight:600;text-align:right;">${joinTeam}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#888;">Adoption Milestones</td>
      <td style="padding:8px 0;font-size:15px;font-weight:600;text-align:right;">${milestones}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#888;">Weekly Summaries Sent (7d)</td>
      <td style="padding:8px 0;font-size:15px;font-weight:600;text-align:right;">${totalSummariesSent}</td>
    </tr>
    ${persistenceFailed > 0 ? `<tr>
      <td style="padding:8px 0;font-size:13px;color:#dc2626;font-weight:600;">⚠️ Webhook Persistence Failures</td>
      <td style="padding:8px 0;font-size:15px;font-weight:600;text-align:right;color:#dc2626;">${persistenceFailed}</td>
    </tr>` : ""}
  </table>

  ${urgentSection}
  ${importantSection}

  <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
  <p style="font-size:11px;color:#aaa;text-align:center;">Hockey App Admin System · Automated Daily Digest</p>
</body></html>`;

    const subject = `📊 Daily Digest — ${signupParent + signupCoach} signups, ${trialsStarted} trials, ${teamPlansPurchased} team plans${paymentFailed > 0 ? ` ⚠️ ${paymentFailed} payment failures` : ""}`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Hockey App Admin <admin@thehockeyapp.lovable.app>",
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      log("resend_failed", { status: resendRes.status, body: errBody });
      return new Response(JSON.stringify({ error: "Email send failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendData = await resendRes.json();

    // Mark non-urgent unemailed events as emailed (urgent ones already got individual emails)
    const unemaledInfoIds = allEvents
      .filter(e => !e.emailed_at && e.severity !== "urgent")
      .map(e => e.id);

    if (unemaledInfoIds.length > 0) {
      await supabase
        .from("admin_activity_log")
        .update({ emailed_at: new Date().toISOString(), email_message_id: `digest-${digestDate}` })
        .in("id", unemaledInfoIds)
        .is("emailed_at", null);
    }

    // Record digest run
    await supabase.from("admin_digest_runs").insert({
      digest_date: digestDate,
      events_included: allEvents.length,
      email_message_id: resendData.id,
    });

    log("digest_sent", { digestDate, eventsCount: allEvents.length, resend_id: resendData.id });

    return new Response(JSON.stringify({ success: true, events_included: allEvents.length, resend_id: resendData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("error", { error: err instanceof Error ? err.message : String(err) });
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});