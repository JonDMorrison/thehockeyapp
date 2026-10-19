import { emailFrame, emailPlainText } from "../_shared/emailDesign.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-admin-alert-secret, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const alertSecret=Deno.env.get("HOCKEY_ADMIN_ALERT_SECRET");
  const serviceRequest=Boolean(serviceKey) && req.headers.get("Authorization")===`Bearer ${serviceKey}`;
  const alertRequest=Boolean(alertSecret) && req.headers.get("x-admin-alert-secret")===alertSecret;
  if(!serviceRequest && !alertRequest)return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{...corsHeaders,"Content-Type":"application/json"}});

  const runId = crypto.randomUUID();
  const log = (msg: string, extra?: Record<string, unknown>) =>
    console.log(JSON.stringify({ run_id: runId, fn: "send-admin-activity-email", msg, ...extra }));

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");


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
      .eq("severity", "urgent")
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

    if(!RESEND_API_KEY || !ADMIN_EMAIL)return new Response(JSON.stringify({error:"Email delivery is not configured"}),{status:503,headers:{...corsHeaders,"Content-Type":"application/json"}});

    // Build email
    const severityEmoji = evt.severity === "urgent" ? "🚨" : evt.severity === "important" ? "⚠️" : "ℹ️";
    const eventType = escapeHtml(evt.event_type.replace(/_/g, " "));
    const subject = `${severityEmoji} [Hockey App] ${evt.event_type.replace(/_/g, " ").toUpperCase()}`;

    const metaRows = Object.entries(evt.metadata || {})
      .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#888;font-size:13px;">${escapeHtml(k)}</td><td style="font-size:13px;">${escapeHtml(v)}</td></tr>`)
      .join("");

    const html = emailFrame(`
  <p style="font-size:12px;color:#596671;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Admin Alert</p>
  <h1 style="font-size:28px;line-height:1.2;margin:0 0 20px;">${severityEmoji} ${eventType}</h1>
  <table role="presentation" style="margin:0 0 16px;width:100%;">
    <tr><td style="padding:4px 12px 4px 0;color:#596671;font-size:16px;">Severity</td><td style="font-size:16px;font-weight:600;">${escapeHtml(evt.severity)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#596671;font-size:16px;">Time</td><td style="font-size:16px;">${new Date(evt.created_at).toLocaleString("en-US", { timeZone: "America/Vancouver" })}</td></tr>
    ${evt.actor_user_id ? `<tr><td style="padding:4px 12px 4px 0;color:#596671;font-size:16px;">User</td><td style="font-size:16px;">${escapeHtml(evt.actor_user_id)}</td></tr>` : ""}
    ${evt.email ? `<tr><td style="padding:4px 12px 4px 0;color:#596671;font-size:16px;">Email</td><td style="font-size:16px;">${escapeHtml(evt.email)}</td></tr>` : ""}
    ${evt.team_id ? `<tr><td style="padding:4px 12px 4px 0;color:#596671;font-size:16px;">Team</td><td style="font-size:16px;">${escapeHtml(evt.team_id)}</td></tr>` : ""}
    ${metaRows}
  </table>
  <p style="font-size:13px;color:#596671;margin-top:24px;">Hockey App Admin System</p>
`, subject, {eyebrow: "Operations · action needed"});

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `admin-activity-${event_id}`,
      },
      body: JSON.stringify({
        from: "Hockey App Admin <admin@hockeyapp.ca>",
        reply_to: Deno.env.get("EMAIL_REPLY_TO") || undefined,
        to: [ADMIN_EMAIL],
        subject,
        html,
        text: emailPlainText(html),
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
    const {error: markError}=await supabase
      .from("admin_activity_log")
      .update({ emailed_at: new Date().toISOString(), email_message_id: resendData.id })
      .eq("id", event_id)
      .is("emailed_at", null);

    if(markError)throw markError;

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
