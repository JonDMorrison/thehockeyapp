import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://www.hockeyapp.ca",
  "https://hockeyapp.ca",
  "http://localhost:8080",
  "http://localhost:5173",
];
const DEFAULT_ORIGIN = "https://www.hockeyapp.ca";

function corsHeadersFor(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : DEFAULT_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

const FROM_ADDRESS = "The Hockey App <hello@hockeyapp.ca>";
const NAVY = "#0f2a4a";

// Escape user-controlled values before interpolating into HTML to prevent
// HTML/script injection in email bodies and subjects.
function escapeHtml(s: unknown): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResp(
  body: Record<string, unknown>,
  status = 200,
  cors: Record<string, string> = corsHeadersFor(null),
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ── Reusable building blocks ──

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td align="left">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;background-color:${NAVY};color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:6px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function wrap(innerHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:32px 24px;background-color:#ffffff;">
    <tr>
      <td>
        ${innerHtml}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="font-size:22px;font-weight:600;margin:0 0 20px 0;color:${NAVY};">${text}</h1>`;
}

function para(text: string): string {
  return `<p style="font-size:16px;line-height:1.65;color:#333333;margin:0 0 16px 0;">${text}</p>`;
}

function unsubscribeFooter(data: Record<string, unknown>): string {
  const unsubscribeUrl = typeof data.unsubscribeUrl === "string" ? data.unsubscribeUrl : "";
  if (!unsubscribeUrl) return "";
  return `<p style="font-size:12px;line-height:1.5;color:#888888;margin:28px 0 0 0;border-top:1px solid #eeeeee;padding-top:16px;">
    You can <a href="${escapeHtml(unsubscribeUrl)}" style="color:#666666;">turn off this email</a> at any time.
  </p>`;
}

interface DigestPlayer {
  name: string;
  sessions: number;
  streak: number;
}

function plainText(html: string): string {
  return html.replace(/<head>[\s\S]*?<\/head>/gi, "")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<\/(?:p|h1|li|tr)>/gi, "\n\n").replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split("\n").map(line => line.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ── Per-type email builders ──

function buildCoachWelcome(data: Record<string, unknown>): { subject: string; html: string } {
  const coachName = escapeHtml(data.coachName ?? "Coach");
  const teamName = escapeHtml(data.teamName ?? "your team");
  const rawTeamCode = String(data.teamCode ?? "");
  const teamCode = escapeHtml(rawTeamCode);
  const hasTeamCode = rawTeamCode.trim().length > 0;

  const subject = "Your team is set up on The Hockey App";

  const inviteStep = hasTeamCode
    ? `Invite parents with your team code <strong>${teamCode}</strong>, one tap from their phone connects their player.`
    : `Invite parents, one tap from their phone connects their player.`;

  const inner = `
    ${heading(subject)}
    ${para(`Hi ${coachName}, your team ${teamName} is ready. Here's the path most coaches take in week one:`)}
    <ol style="font-size:16px;line-height:1.65;color:#333333;margin:0 0 16px 0;padding-left:20px;">
      <li style="margin-bottom:8px;">Set up a program or shooting challenge, then publish it when you are ready.</li>
      <li style="margin-bottom:8px;">${inviteStep}</li>
      <li style="margin-bottom:8px;">Check the dashboard Friday, you'll see exactly who trained without asking anyone.</li>
    </ol>

    ${para("Jon, The Hockey App")}
    ${button("Open your dashboard", "https://www.hockeyapp.ca/teams")}
  `;

  return { subject, html: wrap(inner, subject) };
}

function buildParentInvitation(data: Record<string, unknown>): { subject: string; html: string } {
  const coachName = escapeHtml(data.coachName ?? "Your coach");
  const playerName = escapeHtml(data.playerName ?? "your player");
  const teamName = escapeHtml(data.teamName ?? "the team");
  const teamCode = escapeHtml(data.teamCode ?? "");
  const inviteLink = String(data.inviteLink ?? "https://www.hockeyapp.ca");

  const subject = `${coachName} invited ${playerName} to ${teamName}'s training program`;

  const inner = `
    ${heading(`Join ${teamName}`)}
    ${para(`Hi, ${coachName} uses The Hockey App to give ${teamName} a structured off-ice training plan players follow at home. Join with team code <strong>${teamCode}</strong> and ${playerName} sees their daily checklist right away.`)}
    ${para("Takes about a minute. Player details and training photos stay private, and you control the player account.")}
    ${button(`Join ${teamName}`, inviteLink)}
  `;

  return { subject, html: wrap(inner, subject) };
}

function buildAssociationInvitation(data: Record<string, unknown>): { subject: string; html: string } {
  const associationName = escapeHtml(data.associationName ?? "your hockey association");
  const role = escapeHtml(String(data.role ?? "viewer").replaceAll("_", " "));
  const inviteLink = String(data.inviteLink ?? "https://www.hockeyapp.ca/associations");
  const subject = `You're invited to ${associationName} on The Hockey App`;
  const inner = `
    ${heading(`Join ${associationName}`)}
    ${para(`You've been invited to the association workspace as <strong>${role}</strong>. Use it to coordinate teams and review rollout progress without exposing individual player details across the association.`)}
    ${button("Accept association invitation", inviteLink)}
    ${para("For security, sign in with the email address that received this invitation.")}
  `;
  return { subject, html: wrap(inner, subject) };
}

function buildWeeklyCoachDigest(data: Record<string, unknown>): { subject: string; html: string } {
  const teamName = escapeHtml(data.teamName ?? "Your team");
  const completedCount = Number(data.completedCount ?? 0);
  const rosterCount = Number(data.rosterCount ?? 0);
  const teamProgressUrl = String(data.teamProgressUrl ?? "https://www.hockeyapp.ca/teams");
  const players = Array.isArray(data.players) ? (data.players as DigestPlayer[]) : [];

  // Order: players with sessions first, players with 0 sessions at the bottom.
  const ordered = [...players].sort((a, b) => {
    if ((a.sessions > 0 ? 1 : 0) !== (b.sessions > 0 ? 1 : 0)) {
      return (b.sessions > 0 ? 1 : 0) - (a.sessions > 0 ? 1 : 0);
    }
    return b.sessions - a.sessions;
  });

  const subject = `${teamName} this week: ${completedCount} of ${rosterCount} players trained`;

  const rows = ordered
    .map(
      (p) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eeeeee;font-size:14px;color:#1a1a1a;">${escapeHtml(p.name)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eeeeee;font-size:14px;color:#333333;text-align:center;">${p.sessions}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eeeeee;font-size:14px;color:#333333;text-align:center;">${p.streak}</td>
      </tr>`,
    )
    .join("");

  const inner = `
    ${heading(`${teamName} this week`)}
    ${para(`${completedCount} of ${rosterCount} players trained.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:8px 12px;border-bottom:2px solid ${NAVY};font-size:12px;text-transform:uppercase;letter-spacing:0.3px;color:#888888;text-align:left;">Player</th>
          <th style="padding:8px 12px;border-bottom:2px solid ${NAVY};font-size:12px;text-transform:uppercase;letter-spacing:0.3px;color:#888888;text-align:center;">Sessions</th>
          <th style="padding:8px 12px;border-bottom:2px solid ${NAVY};font-size:12px;text-transform:uppercase;letter-spacing:0.3px;color:#888888;text-align:center;">Streak</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    ${para("Players who haven't started this week are at the bottom, no action needed unless you want to nudge them.")}
    ${button("See full progress", teamProgressUrl)}
    ${unsubscribeFooter(data)}
  `;

  return { subject, html: wrap(inner, subject) };
}

function buildPlayerWeeklyProgress(data: Record<string, unknown>): { subject: string; html: string } {
  const firstName = escapeHtml(data.firstName ?? "Your player");
  const playerId = String(data.playerId ?? "");
  const sessionsCount = Number(data.sessionsCount ?? 0);
  const shotsCount = Number(data.shotsCount ?? 0);
  const streak = Number(data.streak ?? 0);

  const weekUrl = `https://www.hockeyapp.ca/players/${playerId}/week`;
  const isZeroWeek = sessionsCount === 0;

  let subject: string;
  let bodyText: string;

  if (isZeroWeek) {
    subject = `${firstName}'s training is ready for a fresh week`;
    bodyText = `A fresh week is a clean slate. ${firstName}'s training plan is ready whenever they are. Even one session this week keeps the habit alive.`;
  } else {
    subject = `${firstName}'s week: ${sessionsCount} sessions, ${shotsCount} shots`;
    bodyText = `Nice work this week. ${firstName} completed ${sessionsCount} training sessions and logged ${shotsCount} shots. Current streak: ${streak}. Next week's plan is ready — keep the momentum going.`;
  }

  const inner = `
    ${heading(isZeroWeek ? `A fresh week for ${firstName}` : `${firstName}'s week`)}
    ${para(bodyText)}
    ${button("Open this week", weekUrl)}
    ${unsubscribeFooter(data)}
  `;

  return { subject, html: wrap(inner, subject) };
}

// ── Main handler ──

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  const cors = corsHeadersFor(req.headers.get("origin"));

  if (req.method !== "POST" && req.method !== "OPTIONS") return jsonResp({ error: "Method not allowed" }, 405, cors);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    const serviceRequest = authHeader === `Bearer ${SERVICE_ROLE_KEY}`;
    let user: { id: string; email?: string } | null = null;

    if (!serviceRequest && authHeader?.startsWith("Bearer ")) {
      const authClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: authUser } } = await authClient.auth.getUser(authHeader.slice(7));
      user = authUser ? { id: authUser.id, email: authUser.email } : null;
    }

    if (!serviceRequest && !user) {
      return jsonResp({ error: "Unauthorized" }, 401, cors);
    }

    const { type, to: rawTo, data } = (await req.json()) as {
      type?: string;
      to?: string;
      data?: Record<string, unknown>;
    };

    const to = typeof rawTo === "string" ? rawTo.trim().toLowerCase() : "";
    if (!type || !to) {
      return jsonResp({ error: "Missing required fields: type, to" }, 400, cors);
    }

    if (typeof to !== "string" || !EMAIL_RE.test(to)) {
      return jsonResp({ error: "Invalid recipient email" }, 400, cors);
    }

    if (data !== undefined && (typeof data !== "object" || data === null || Array.isArray(data))) return jsonResp({ error: "Invalid email data" }, 400, cors);
    const payload = data ?? {};
    const authClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader! } } });
    let eventId = "";
    let builtPayload = payload;

    if (type === "weekly_coach_digest" || type === "player_weekly_progress") {
      if (!serviceRequest) return jsonResp({ error: "Forbidden" }, 403, cors);
    } else if (type === "association_invitation") {
      const associationId = typeof payload.associationId === "string" ? payload.associationId : "";
      if (!associationId) return jsonResp({ error: "Missing association context" }, 400, cors);
      const { data: role, error: roleError } = serviceRequest ? { data: null, error: null } : await authClient.from("association_roles").select("role").eq("association_id", associationId).eq("user_id", user?.id ?? "").in("role", ["owner", "director", "admin"]).maybeSingle();
      if (roleError) return jsonResp({ error: "Could not verify invitation permissions" }, 503, cors);
      if (!serviceRequest && !role) return jsonResp({ error: "Forbidden" }, 403, cors);
      const lookup = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { data: invite, error } = await lookup.from("association_invites").select("id,token,role,expires_at").eq("association_id", associationId).eq("invited_email", to).eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: association, error: associationError } = await lookup.from("associations").select("name").eq("id", associationId).maybeSingle();
      if (error || associationError) return jsonResp({ error: "Could not load invitation" }, 503, cors);
      if (!invite || !association || Date.parse(invite.expires_at) <= Date.now()) return jsonResp({ error: "Create an active invitation before emailing it" }, 409, cors);
      eventId = invite.id;
      builtPayload = { associationName: association.name, role: invite.role, inviteLink: `${DEFAULT_ORIGIN}/association/join/${invite.token}` };
    } else if (type === "parent_invitation" || type === "coach_welcome") {
      const teamId = typeof payload.teamId === "string" ? payload.teamId : "";
      if (!teamId) return jsonResp({ error: "Missing team context" }, 400, cors);
      const { data: role, error: roleError } = serviceRequest ? { data: null, error: null } : await authClient.from("team_roles").select("role").eq("team_id", teamId).eq("user_id", user?.id ?? "").maybeSingle();
      if (roleError) return jsonResp({ error: "Could not verify team permissions" }, 503, cors);
      if (!serviceRequest && !["head_coach", "assistant_coach", "manager"].includes(role?.role)) return jsonResp({ error: "Forbidden" }, 403, cors);
      if (type === "coach_welcome" && !serviceRequest && to !== user?.email?.toLowerCase()) return jsonResp({ error: "Welcome email recipient must match the signed-in account" }, 403, cors);
      const lookup = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      const { data: team, error: teamError } = await lookup.from("teams").select("name").eq("id", teamId).maybeSingle();
      const { data: invite, error: inviteError } = await lookup.from("team_invites").select("id,token,short_code,expires_at").eq("team_id", teamId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (teamError || inviteError) return jsonResp({ error: "Could not load team invitation" }, 503, cors);
      if (!team || (type === "parent_invitation" && (!invite || Date.parse(invite.expires_at) <= Date.now()))) return jsonResp({ error: "Create an active invitation before emailing it" }, 409, cors);
      eventId = type === "coach_welcome" ? teamId : invite!.id;
      builtPayload = { coachName: type === "coach_welcome" ? "Coach" : "Your coach", teamName: team.name, teamCode: invite?.short_code ?? "", playerName: typeof payload.playerName === "string" ? payload.playerName.slice(0, 100) : "your player", inviteLink: invite ? `${DEFAULT_ORIGIN}/join/${invite.token}` : undefined };
    } else return jsonResp({ error: "Unknown email type" }, 400, cors);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return jsonResp({ error: "Email delivery is temporarily unavailable. You can still copy the invitation link." }, 503, cors);

    let built: { subject: string; html: string };
    switch (type) {
      case "coach_welcome":
        built = buildCoachWelcome(builtPayload);
        break;
      case "parent_invitation":
        built = buildParentInvitation(builtPayload);
        break;
      case "association_invitation":
        built = buildAssociationInvitation(builtPayload);
        break;
      case "weekly_coach_digest":
        built = buildWeeklyCoachDigest(payload);
        break;
      case "player_weekly_progress":
        built = buildPlayerWeeklyProgress(payload);
        break;
      default:
        return jsonResp({ error: `Unknown email type: ${type}` }, 400, cors);
    }

    const delivery = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map(byte => byte.toString(16).padStart(2, "0")).join("");
    // Stable across retries. Invitations may be sent again the next UTC day.
    const day = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `hockey-${await digest(JSON.stringify([type, to, eventId, builtPayload, type === "coach_welcome" ? "once" : day]))}`;
    const recipientHash = await digest(to);
    const { data: claim, error: claimError } = await delivery.rpc("claim_email_delivery", { p_key: idempotencyKey, p_actor: user?.id ?? null, p_recipient_hash: recipientHash, p_type: type });
    if (claimError) return jsonResp({ error: "Could not prepare email delivery. Please try again." }, 503, cors);
    if (claim?.status === "sent") return jsonResp({ success: true, already_sent: true, id: claim.id }, 200, cors);
    if (claim?.status !== "ready") return jsonResp({ error: claim?.status === "rate_limited" ? "Email limit reached. Please wait before sending again, or copy the invitation link." : "This email is already being sent. Please wait a moment before retrying." }, 429, cors);
    const markFailed = () => delivery.from("email_delivery_attempts").update({ status: "failed", updated_at: new Date().toISOString() }).eq("idempotency_key", idempotencyKey);
    let resendRes: Response;
    try {
      resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ from: FROM_ADDRESS, reply_to: Deno.env.get("EMAIL_REPLY_TO") || undefined, to: [to], subject: built.subject.replace(/[\r\n]/g, " ").slice(0, 200), html: built.html, text: plainText(built.html) }),
      });
    } catch {
      await markFailed();
      return jsonResp({ error: "Email delivery timed out. Please try again or copy the invitation link." }, 503, cors);
    }
    if (!resendRes.ok) {
      await markFailed();
      console.log(JSON.stringify({ fn: "send-transactional-email", msg: "resend_failed", type, status: resendRes.status }));
      return jsonResp({ error: "Email could not be sent. Please try again or copy the invitation link." }, 503, cors);
    }
    const resendData = await resendRes.json();
    if (typeof resendData.id !== "string" || !resendData.id) { await markFailed(); return jsonResp({ error: "Email provider did not confirm delivery. Please try again." }, 503, cors); }
    const { error: savedError } = await delivery.from("email_delivery_attempts").update({ status: "sent", provider_message_id: resendData.id, updated_at: new Date().toISOString() }).eq("idempotency_key", idempotencyKey);
    if (savedError) return jsonResp({ error: "Could not confirm the email status. Retrying will not send a duplicate." }, 503, cors);
    return jsonResp({ success: true, id: resendData.id }, 200, cors);
  } catch {
    console.log(
      JSON.stringify({
        fn: "send-transactional-email",
        msg: "unhandled_error",
        error: "request_failed",
      }),
    );
    return jsonResp(
      { error: "Email request could not be completed. Please try again." },
      500,
      cors,
    );
  }
});
