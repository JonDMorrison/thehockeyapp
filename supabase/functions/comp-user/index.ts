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
    // Verify admin key
    const adminKey = req.headers.get("x-admin-key");
    if (!adminKey || adminKey !== Deno.env.get("ADMIN_API_KEY")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, action } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find user by email
    const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw listErr;

    const user = users.users.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!user) {
      return new Response(
        JSON.stringify({ error: `No user found with email: ${email}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    if (action === "revoke") {
      // Remove comped subscription
      await supabase
        .from("subscriptions")
        .delete()
        .eq("user_id", userId)
        .is("stripe_subscription_id", null);

      // Reset entitlements to free
      await supabase
        .from("entitlements")
        .update({
          can_view_full_history: false,
          can_access_programs: false,
          can_view_snapshot: false,
          can_receive_ai_summary: false,
          can_export_reports: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      console.log(`[COMP-USER] Revoked Pro for ${email} (${userId})`);
      return new Response(
        JSON.stringify({ success: true, message: `Revoked Pro access for ${email}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default action: grant Pro
    // Upsert subscription as comped (no stripe_subscription_id)
    const { error: subErr } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan: "pro",
          status: "active",
          stripe_subscription_id: null,
          stripe_customer_id: null,
          current_period_end: "2099-12-31T23:59:59Z",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (subErr) throw subErr;

    // Grant all entitlements
    const { error: entErr } = await supabase
      .from("entitlements")
      .upsert(
        {
          user_id: userId,
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

    console.log(`[COMP-USER] Granted comped Pro to ${email} (${userId})`);

    return new Response(
      JSON.stringify({ success: true, message: `Granted free Pro access to ${email}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[COMP-USER] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
