import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth: extract JWT and verify super admin ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminUserId = userData.user.id;
    const adminEmail = userData.user.email?.toLowerCase() ?? "";

    // Check super admin via env var
    const allowedEmails = (Deno.env.get("SUPER_ADMIN_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!allowedEmails.includes(adminEmail)) {
      return new Response(JSON.stringify({ error: "Forbidden: not an admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Parse input ---
    const { email, reason, tag, days = 365 } = await req.json();
    if (!email || !reason || !tag) {
      return new Response(
        JSON.stringify({ error: "email, reason, and tag are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validReasons = ["friend", "influencer", "partner", "internal", "other"];
    if (!validReasons.includes(reason)) {
      return new Response(
        JSON.stringify({ error: `reason must be one of: ${validReasons.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof days !== "number" || days < 1 || days > 3650) {
      return new Response(
        JSON.stringify({ error: "days must be between 1 and 3650" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Enforce caps ---
    const activeCap = parseInt(Deno.env.get("COMP_ACTIVE_CAP") ?? "200", 10);
    const grants7dCap = parseInt(Deno.env.get("COMP_GRANTS_7D_CAP") ?? "20", 10);

    const { count: activeCount } = await supabaseAdmin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("source", "comp")
      .eq("status", "comped")
      .is("revoked_at", null)
      .gt("current_period_end", new Date().toISOString());

    if ((activeCount ?? 0) >= activeCap) {
      return new Response(
        JSON.stringify({ error: `Active comp cap reached (${activeCap}). Revoke existing comps first.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("source", "comp")
      .gte("comp_granted_at", sevenDaysAgo);

    if ((recentCount ?? 0) >= grants7dCap) {
      return new Response(
        JSON.stringify({ error: `Rate limit: max ${grants7dCap} comp grants per 7 days.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Resolve target user ---
    const targetEmail = email.trim().toLowerCase();
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = users?.users?.find(
      (u: any) => u.email?.toLowerCase() === targetEmail
    );

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    if (targetUser) {
      // User exists — grant comp directly
      const { error: subErr } = await supabaseAdmin
        .from("subscriptions")
        .upsert(
          {
            user_id: targetUser.id,
            plan: "pro",
            status: "comped",
            source: "comp",
            current_period_end: expiresAt,
            comp_reason: reason,
            comp_tag: tag,
            comp_granted_by: adminUserId,
            comp_granted_at: new Date().toISOString(),
            revoked_at: null,
            revoked_by: null,
            stripe_subscription_id: null,
            stripe_customer_id: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (subErr) throw subErr;

      const { error: entErr } = await supabaseAdmin
        .from("entitlements")
        .upsert(
          {
            user_id: targetUser.id,
            can_view_full_history: true,
            can_access_programs: true,
            can_view_snapshot: true,
            can_receive_ai_summary: true,
            can_export_reports: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (entErr) throw entErr;

      console.log(`[GRANT-COMP] Granted comp Pro to ${targetEmail} (${targetUser.id}) by ${adminEmail}`);

      return new Response(
        JSON.stringify({ success: true, email: targetEmail, expires_at: expiresAt, mode: "attached" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // User doesn't exist — create pending grant
      const { error: pendErr } = await supabaseAdmin
        .from("pending_comp_grants")
        .insert({
          email: targetEmail,
          reason,
          tag,
          days,
          created_by: adminUserId,
        });
      if (pendErr) throw pendErr;

      console.log(`[GRANT-COMP] Created pending comp for ${targetEmail} by ${adminEmail}`);

      return new Response(
        JSON.stringify({ success: true, email: targetEmail, expires_at: expiresAt, mode: "pending" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("[GRANT-COMP] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
