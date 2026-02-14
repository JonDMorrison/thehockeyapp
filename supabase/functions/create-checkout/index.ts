import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user?.email) {
      return new Response(JSON.stringify({ error: "No email found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const purchaseType: string = body.purchase_type || "parent_pro";
    const preferredCurrency = (body.preferred_currency || "CAD").toUpperCase();
    const teamId: string | null = body.team_id || null;

    // ─── Resolve price ID based on purchase type ───
    let priceId: string;

    if (purchaseType === "team_plan") {
      if (!teamId) {
        return new Response(JSON.stringify({ error: "team_id is required for team_plan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const cadId = Deno.env.get("STRIPE_TEAM_PRICE_ID_CAD_LIVE");
      const usdId = Deno.env.get("STRIPE_TEAM_PRICE_ID_USD_LIVE");
      if (!cadId || !usdId) throw new Error("Team plan price IDs not configured");
      priceId = preferredCurrency === "USD" ? usdId : cadId;
    } else {
      const cadId = Deno.env.get("STRIPE_PRO_PRICE_ID_CAD_LIVE");
      const usdId = Deno.env.get("STRIPE_PRO_PRICE_ID_USD_LIVE");
      if (!cadId || !usdId) throw new Error("Pro price IDs not configured");
      priceId = preferredCurrency === "USD" ? usdId : cadId;
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://thehockeyapp.lovable.app";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        purchase_type: purchaseType,
        ...(teamId ? { team_id: teamId } : {}),
      },
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/settings?checkout=cancelled`,
    };

    // Trial only for parent_pro, never for team_plan
    if (purchaseType === "parent_pro") {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("has_used_trial")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!(profile?.has_used_trial ?? false)) {
        sessionParams.subscription_data = { trial_period_days: 7 };
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-checkout error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
