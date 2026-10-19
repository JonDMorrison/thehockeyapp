/** Closed calendar weeks and bounded, preference-aware operational email batches. */
export function closedWeek(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  end.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 6) % 7));
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 7);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
export function deliverableAddress(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/@(?:example\.(?:com|net|org)|[^@]*\.invalid)$/i.test(value);
}
const headers = { "Content-Type": "application/json" };
function json(body: object, status = 200) { return new Response(JSON.stringify(body), { status, headers }); }

export async function weeklyEmail(req: Request, kind: "coach" | "parent", createClient: any, env: (name: string) => string | undefined) {
  const secret = env("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "Unauthorized" }, 401);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let input: { target_id?: string; offset?: number; dry_run?: boolean };
  try { const text = await req.text(); input = text ? JSON.parse(text) : {}; } catch { return json({ error: "Invalid request" }, 400); }
  if (input?.dry_run !== undefined && typeof input.dry_run !== "boolean") return json({ error: "Invalid email batch" }, 400);
  if (!input || typeof input !== "object" || Array.isArray(input) || (input.target_id && !/^[0-9a-f-]{36}$/i.test(input.target_id)) || (input.offset !== undefined && (!Number.isInteger(input.offset) || input.offset < 0 || input.offset > 100000 || input.offset % 50 !== 0))) return json({ error: "Invalid email batch" }, 400);
  const url = env("SUPABASE_URL")!, key = env("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(url, key), week = closedWeek();
  const offset = input.offset ?? 0;
  let source = client.from(kind === "coach" ? "teams" : "players").select(kind === "coach" ? "id,name" : "id,first_name,owner_user_id").order("id").range(offset, offset + 50);
  if (input.target_id) source = source.eq("id", input.target_id);
  const { data: rows, error: sourceError } = await source;
  if (sourceError) return json({ error: "Could not load email batch" }, 503);
  let sent = 0, skipped = 0, failed = 0, eligible = 0;
  for (const row of (rows ?? []).slice(0, 50)) {
    try {
      let recipient = row.owner_user_id;
      if (kind === "coach") {
        const result = await client.from("team_roles").select("user_id").eq("team_id", row.id).eq("role", "head_coach").limit(1).maybeSingle();
        if (result.error) throw new Error("role_read"); recipient = result.data?.user_id;
      }
      if (!recipient) { skipped++; continue; }
      if (kind === "parent") {
        // Primary owner only. Never select an arbitrary or withdrawn additional guardian.
        const consent = await client.from("player_consents").select("id").eq("player_id", row.id).eq("guardian_user_id", recipient).eq("relationship_confirmed", true).is("withdrawn_at", null).maybeSingle();
        if (consent.error) throw new Error("consent_read");
        if (!consent.data) { skipped++; continue; }
      }
      const flag = kind === "coach" ? "weekly_coach_digest" : "player_weekly_progress";
      const confirmation = kind === "coach" ? "coach_digest_confirmed_at" : "player_progress_confirmed_at";
      const pref = await client.from("email_preferences").select(`${flag},${confirmation},unsubscribe_token`).eq("user_id", recipient).maybeSingle();
      if (pref.error) throw new Error("preference_read");
      if (!pref.data?.[flag] || !pref.data?.[confirmation]) { skipped++; continue; }
      const profile = await client.from("profiles").select("email").eq("user_id", recipient).maybeSingle();
      if (profile.error) throw new Error("profile_read");
      if (!deliverableAddress(profile.data?.email)) { skipped++; continue; }
      const unsubscribeUrl = `https://www.hockeyapp.ca/unsubscribe/${pref.data.unsubscribe_token}?kind=${flag}`;
      let payload: Record<string, unknown>;
      if (kind === "coach") {
        const roster = await client.from("team_memberships").select("player_id,players(id,first_name)").eq("team_id", row.id).eq("status", "active");
        if (roster.error) throw new Error("roster_read");
        const players = [];
        for (const entry of roster.data ?? []) {
          if (!entry.players) continue;
          const metrics = await client.rpc("weekly_email_metrics", { p_player_id: entry.player_id, p_week_start: week.start, p_week_end: week.end, p_team_id: row.id });
          if (metrics.error || !metrics.data) throw new Error("metrics_read");
          players.push({ name: entry.players.first_name, sessions: metrics.data.sessions });
        }
        payload = { teamName: row.name, rosterCount: players.length, completedCount: players.filter(p => p.sessions > 0).length, players, teamProgressUrl: `https://www.hockeyapp.ca/teams/${row.id}/progress` };
      } else {
        const metrics = await client.rpc("weekly_email_metrics", { p_player_id: row.id, p_week_start: week.start, p_week_end: week.end });
        if (metrics.error || !metrics.data) throw new Error("metrics_read");
        payload = { firstName: row.first_name, playerId: row.id, sessionsCount: metrics.data.sessions, shotsCount: metrics.data.shots, targetShotsCount: metrics.data.targetShots };
      }
      eligible++;
      if (input.dry_run) continue;
      const response = await fetch(`${url}/functions/v1/send-transactional-email`, { method: "POST", signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ type: kind === "coach" ? "weekly_coach_digest" : "player_weekly_progress", to: profile.data.email, data: { ...payload, unsubscribeUrl, deliveryKey: `${kind}:${row.id}:${week.start}` } }) });
      if (!response.ok || !(await response.json()).success) throw new Error("delivery_failed");
      sent++;
    } catch { failed++; /* Report counts only; never log child details or email bodies. */ }
  }
  const hasMore = (rows?.length ?? 0) > 50;
  if (hasMore && !input.target_id && !input.dry_run) {
    const queued = await client.rpc("dispatch_weekly_email_page", { p_kind: kind, p_offset: offset + 50 });
    if (queued.error) failed++;
  }
  return json({ success: failed === 0, processed: Math.min(rows?.length ?? 0, 50), eligible, sent, skipped, failed, has_more: hasMore, week_start: week.start, week_end_exclusive: week.end }, failed ? 207 : 200);
}
