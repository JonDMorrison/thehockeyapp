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

    // Check super admin via admin_config table (single source of truth)
    const { data: configRow } = await supabaseAdmin
      .from("admin_config")
      .select("value")
      .eq("key", "super_admin_emails")
      .maybeSingle();

    const allowedEmails = (configRow?.value ?? "")
      .split(",")
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!allowedEmails.includes(adminEmail)) {
      return new Response(JSON.stringify({ error: "Forbidden: not an admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Parse input ---
    const body = await req.json();
    let targetUserId: string | null = body.user_id ?? null;
    const targetEmail: string | null = body.email?.trim().toLowerCase() ?? null;

    if (!targetUserId && !targetEmail) {
      return new Response(
        JSON.stringify({ error: "user_id or email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve user_id from email if needed
    if (!targetUserId && targetEmail) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const found = users?.users?.find(
        (u: any) => u.email?.toLowerCase() === targetEmail
      );
      if (!found) {
        return new Response(
          JSON.stringify({ error: `No user found with email: ${targetEmail}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetUserId = found.id;
    }

    // --- Revoke comp ---
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("source, status")
      .eq("user_id", targetUserId!)
      .eq("source", "comp")
      .eq("status", "comped")
      .maybeSingle();

    if (!existingSub) {
      return new Response(
        JSON.stringify({ error: "No active comp subscription found for this user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update subscription to revoked
    const { error: revokeErr } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: adminUserId,
        current_period_end: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", targetUserId!)
      .eq("source", "comp");

    if (revokeErr) throw revokeErr;

    // --- Recompute entitlements based on remaining subscriptions ---
    // Check if user has a separate paid active subscription
    const { data: paidSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", targetUserId!)
      .eq("plan", "pro")
      .eq("source", "paid")
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .maybeSingle();

    const hasPaidActive = !!paidSub;

    const { error: entErr } = await supabaseAdmin
      .from("entitlements")
      .update({
        can_view_full_history: hasPaidActive,
        can_access_programs: hasPaidActive,
        can_view_snapshot: hasPaidActive,
        can_receive_ai_summary: hasPaidActive,
        can_export_reports: hasPaidActive,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", targetUserId!);

    if (entErr) throw entErr;

    console.log(`[REVOKE-COMP] Revoked comp for user ${targetUserId} by ${adminEmail}. Paid active: ${hasPaidActive}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: targetUserId,
        recomputed_entitlements: hasPaidActive,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[REVOKE-COMP] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
