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
    console.log(JSON.stringify({ run_id: runId, fn: "send-admin-activity-email", msg, ...extra }));

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { event_id } = await req.json();
    if (!event_id) {
      return new Response(JSON.stringify({ error: "event_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load the event
    const { data: evt, error: evtErr } = await supabase
      .from("admin_activity_log")
      .select("*")
      .eq("id", event_id)
      .single();

    if (evtErr || !evt) {
      log("event_not_found", { event_id });
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: skip if already emailed
    if (evt.emailed_at) {
      log("already_emailed", { event_id });
      return new Response(JSON.stringify({ success: true, already_sent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build email
    const severityEmoji = evt.severity === "urgent" ? "🚨" : evt.severity === "important" ? "⚠️" : "ℹ️";
    const subject = `${severityEmoji} [Hockey App] ${evt.event_type.replace(/_/g, " ").toUpperCase()}`;

    const metaRows = Object.entries(evt.metadata || {})
      .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#888;font-size:13px;">${k}</td><td style="font-size:13px;">${String(v)}</td></tr>`)
      .join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
  <p style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Admin Alert</p>
  <h2 style="margin:0 0 16px;">${severityEmoji} ${evt.event_type.replace(/_/g, " ")}</h2>
  <table style="margin:0 0 16px;width:100%;">
    <tr><td style="padding:4px 12px 4px 0;color:#888;font-size:13px;">Severity</td><td style="font-size:13px;font-weight:600;">${evt.severity}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#888;font-size:13px;">Time</td><td style="font-size:13px;">${new Date(evt.created_at).toLocaleString("en-US", { timeZone: "America/Vancouver" })}</td></tr>
    ${evt.actor_user_id ? `<tr><td style="padding:4px 12px 4px 0;color:#888;font-size:13px;">User</td><td style="font-size:13px;">${evt.actor_user_id}</td></tr>` : ""}
    ${evt.email ? `<tr><td style="padding:4px 12px 4px 0;color:#888;font-size:13px;">Email</td><td style="font-size:13px;">${evt.email}</td></tr>` : ""}
    ${evt.team_id ? `<tr><td style="padding:4px 12px 4px 0;color:#888;font-size:13px;">Team</td><td style="font-size:13px;">${evt.team_id}</td></tr>` : ""}
    ${metaRows}
  </table>
  <p style="font-size:11px;color:#aaa;margin-top:24px;">Hockey App Admin System</p>
</body></html>`;

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

    // Mark as emailed
    await supabase
      .from("admin_activity_log")
      .update({ emailed_at: new Date().toISOString(), email_message_id: resendData.id })
      .eq("id", event_id)
      .is("emailed_at", null);

    log("sent", { event_id, resend_id: resendData.id });

    return new Response(JSON.stringify({ success: true, resend_id: resendData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("error", { error: err instanceof Error ? err.message : String(err) });
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});