import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
        <a href="${href}" style="display:inline-block;padding:12px 28px;background-color:${NAVY};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:6px;">
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
  return `<p style="font-size:15px;line-height:1.65;color:#333333;margin:0 0 16px 0;">${text}</p>`;
}

interface DigestPlayer {
  name: string;
  sessions: number;
  streak: number;
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
    <ol style="font-size:15px;line-height:1.65;color:#333333;margin:0 0 16px 0;padding-left:20px;">
      <li style="margin-bottom:8px;">${inviteStep}</li>
      <li style="margin-bottom:8px;">Publish your first week, players see it the moment you publish.</li>
      <li style="margin-bottom:8px;">Check the dashboard Friday, you'll see exactly who trained without asking anyone.</li>
    </ol>
    ${para("Reply any time, a real person reads it.")}
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
    ${para("Takes about a minute. Nothing is public, no rankings, and you control the account.")}
    ${button(`Join ${teamName}`, inviteLink)}
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
  `;

  return { subject, html: wrap(inner, subject) };
}

// ── Main handler ──

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  const cors = corsHeadersFor(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.log(
        JSON.stringify({
          fn: "send-transactional-email",
          msg: "RESEND_API_KEY not configured, skipping send",
        }),
      );
      return jsonResp({ skipped: true }, 200, cors);
    }

    const { type, to, data } = (await req.json()) as {
      type?: string;
      to?: string;
      data?: Record<string, unknown>;
    };

    if (!type || !to) {
      return jsonResp({ error: "Missing required fields: type, to" }, 400, cors);
    }

    if (typeof to !== "string" || !EMAIL_RE.test(to)) {
      return jsonResp({ error: "Invalid recipient email" }, 400, cors);
    }

    const payload = data ?? {};

    let built: { subject: string; html: string };
    switch (type) {
      case "coach_welcome":
        built = buildCoachWelcome(payload);
        break;
      case "parent_invitation":
        built = buildParentInvitation(payload);
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

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject: built.subject,
        html: built.html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.log(
        JSON.stringify({
          fn: "send-transactional-email",
          msg: "resend_failed",
          type,
          status: resendRes.status,
          body: errBody,
        }),
      );
      return jsonResp({ error: "Failed to send email" }, 500, cors);
    }

    const resendData = await resendRes.json();
    return jsonResp({ success: true, id: resendData.id }, 200, cors);
  } catch (error) {
    console.log(
      JSON.stringify({
        fn: "send-transactional-email",
        msg: "unhandled_error",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return jsonResp(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
      cors,
    );
  }
});
