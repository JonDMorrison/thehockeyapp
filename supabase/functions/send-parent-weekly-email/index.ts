import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// The old aggregate sender bypassed preference/unsubscribe checks and promoted disabled paid plans.
// All current progress email uses player-weekly-progress-cron instead.
serve(req => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey || req.headers.get("Authorization") !== `Bearer ${serviceKey}`) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ error: "This legacy sender is retired. Use the preference-aware weekly progress sender." }), { status: 410, headers: { "Content-Type": "application/json" } });
});
