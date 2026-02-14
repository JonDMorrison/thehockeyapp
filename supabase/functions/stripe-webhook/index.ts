import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function log(level: "info" | "warn" | "error", msg: string, ctx: Record<string, unknown> = {}) {
  const entry = { level, msg, ts: new Date().toISOString(), ...ctx };
  if (level === "error") console.error(JSON.stringify(entry));
  else if (level === "warn") console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    log("error", "STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // ─── Price ID sets ───
  const proPriceIds: string[] = [];
  const cadPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID_CAD_LIVE");
  const usdPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID_USD_LIVE");
  if (cadPriceId) proPriceIds.push(cadPriceId);
  if (usdPriceId) proPriceIds.push(usdPriceId);

  const teamPriceIds: string[] = [];
  const teamCadPriceId = Deno.env.get("STRIPE_TEAM_PRICE_ID_CAD_LIVE");
  const teamUsdPriceId = Deno.env.get("STRIPE_TEAM_PRICE_ID_USD_LIVE");
  if (teamCadPriceId) teamPriceIds.push(teamCadPriceId);
  if (teamUsdPriceId) teamPriceIds.push(teamUsdPriceId);

  if (proPriceIds.length === 0) {
    log("error", "No Pro price IDs configured");
    return new Response("Price IDs not configured", { status: 500 });
  }

  const allowTrials = Deno.env.get("ALLOW_TRIALS") === "true";

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("No signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    log("error", "Webhook signature verification failed", { error: err instanceof Error ? err.message : String(err) });
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : "Unknown"}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const eventCtx = { eventId: event.id, eventType: event.type };

  const relevantEvents = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "checkout.session.completed",
    "invoice.payment_failed",
  ];

  if (!relevantEvents.includes(event.type)) {
    return new Response(JSON.stringify({ received: true, ignored: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ─── Handle checkout.session.completed ───
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const refUserId = session.client_reference_id || session.metadata?.user_id;
    const sessionCustomerId = session.customer as string | null;
    const purchaseType = session.metadata?.purchase_type || "parent_pro";
    const teamId = session.metadata?.team_id;

    log("info", "Checkout completed", {
      ...eventCtx,
      sessionId: session.id,
      customer: sessionCustomerId,
      subscription: session.subscription,
      refUserId,
      purchaseType,
      teamId,
    });

    if (purchaseType === "team_plan" && teamId && sessionCustomerId) {
      // Seed team_subscriptions for team plan checkout
      const { error: seedErr } = await supabase
        .from("team_subscriptions")
        .upsert(
          {
            team_id: teamId,
            stripe_customer_id: sessionCustomerId,
            stripe_subscription_id: (session.subscription as string) || null,
            status: "active",
            created_by_user_id: refUserId,
          },
          { onConflict: "team_id" }
        );

      if (seedErr) {
        log("error", "Failed to seed team_subscriptions from checkout", { ...eventCtx, teamId, dbError: seedErr });
        return new Response(JSON.stringify({ error: "db_team_checkout_seed_failed" }), {
          status: 500, headers: { "Content-Type": "application/json" },
        });
      }
    } else if (refUserId && sessionCustomerId) {
      // Seed individual subscriptions row
      const { error: seedErr } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: refUserId,
            stripe_customer_id: sessionCustomerId,
            stripe_subscription_id: (session.subscription as string) || null,
            status: "active",
            plan: "free", // Will be corrected by subscription.created
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (seedErr) {
        log("error", "Failed to seed subscription from checkout", { ...eventCtx, refUserId, dbError: seedErr });
        return new Response(JSON.stringify({ error: "db_checkout_seed_failed" }), {
          status: 500, headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ received: true, type: "checkout.session.completed" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ─── Handle invoice.payment_failed ───
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;
    log("error", "Payment failed", { ...eventCtx, invoiceId: invoice.id, customerId });

    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && "email" in customer && customer.email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", customer.email)
        .maybeSingle();

      if (profile) {
        await supabase.from("notifications").insert({
          user_id: profile.user_id,
          title: "Payment Failed",
          message: "Your subscription payment failed. Please update your payment method to keep your Pro features.",
          notification_type: "payment_failed",
        });
      }
    }

    return new Response(JSON.stringify({ received: true, type: "invoice.payment_failed" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ─── Subscription events ───
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  const subscriptionPriceIds = (subscription.items?.data || []).map(
    (item: { price: { id: string } }) => item.price.id
  );
  const matchesProPrice = subscriptionPriceIds.some((pid: string) => proPriceIds.includes(pid));
  const matchesTeamPrice = subscriptionPriceIds.some((pid: string) => teamPriceIds.includes(pid));

  const mapStatus = (s: string): string => {
    switch (s) {
      case "active": return "active";
      case "trialing": return "trialing";
      case "past_due": return "past_due";
      case "canceled":
      case "unpaid":
      case "incomplete_expired": return "cancelled";
      default: return "cancelled";
    }
  };

  const status = mapStatus(subscription.status);
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  // ─── TEAM PLAN subscription events ───
  if (matchesTeamPrice) {
    // Find team_id from existing team_subscriptions by stripe_customer_id or stripe_subscription_id
    const { data: existingTeamSub } = await supabase
      .from("team_subscriptions")
      .select("team_id")
      .or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${customerId}`)
      .maybeSingle();

    if (!existingTeamSub) {
      log("warn", "No team_subscriptions row found for team subscription event", { ...eventCtx, customerId, subscriptionId: subscription.id });
      return new Response(JSON.stringify({ received: true, warning: "no_team_sub_row" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const teamStatus = status === "active" ? "active" : (status === "cancelled" ? "cancelled" : status);

    const { error: teamSubErr } = await supabase
      .from("team_subscriptions")
      .update({
        status: teamStatus,
        current_period_end: periodEnd,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
      })
      .eq("team_id", existingTeamSub.team_id);

    if (teamSubErr) {
      log("error", "Failed to update team_subscriptions", { ...eventCtx, teamId: existingTeamSub.team_id, dbError: teamSubErr });
      return new Response(JSON.stringify({ error: "db_team_sub_update_failed" }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    // Refresh entitlements for all users on this team
    const { data: teamMembers } = await supabase
      .from("team_memberships")
      .select("player_id, players(owner_user_id)")
      .eq("team_id", existingTeamSub.team_id)
      .eq("status", "active");

    if (teamMembers) {
      const userIds = new Set<string>();
      for (const m of teamMembers) {
        const ownerUserId = (m.players as unknown as { owner_user_id: string })?.owner_user_id;
        if (ownerUserId) userIds.add(ownerUserId);
      }

      const isActive = teamStatus === "active";
      for (const uid of userIds) {
        await supabase
          .from("entitlements")
          .upsert(
            {
              user_id: uid,
              can_view_full_history: isActive,
              can_access_programs: isActive,
              can_view_snapshot: isActive,
              can_receive_ai_summary: isActive,
              can_export_reports: isActive,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
      }
    }

    log("info", "Team subscription webhook processed", { ...eventCtx, teamId: existingTeamSub.team_id, status: teamStatus });
    return new Response(JSON.stringify({ received: true, type: "team_subscription", teamId: existingTeamSub.team_id }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ─── INDIVIDUAL PRO subscription events ───
  let userId: string | null = null;

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (existingSub) {
    userId = existingSub.user_id;
    log("info", "Resolved user via stripe_customer_id", { ...eventCtx, customerId, userId });
  } else {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !("email" in customer) || !customer.email) {
      log("error", "Customer deleted or no email", { ...eventCtx, customerId });
      return new Response(JSON.stringify({ received: true, error: "no_email" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", customer.email)
      .maybeSingle();

    if (!profile) {
      log("error", "No profile found for email", { ...eventCtx, email: customer.email });
      return new Response(JSON.stringify({ received: true, error: "no_user" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    userId = profile.user_id;
    log("info", "Resolved user via email fallback", { ...eventCtx, customerId, userId });
  }

  const subCtx = { ...eventCtx, userId, customerId, subscriptionId: subscription.id };

  let plan: string;
  if (!matchesProPrice) {
    plan = "free";
  } else if (status === "active") {
    plan = "pro";
  } else if (status === "trialing") {
    plan = allowTrials ? "pro" : "free";
  } else {
    plan = "free";
  }

  const { error: subErr } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        status,
        plan,
        current_period_end: periodEnd,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (subErr) {
    log("error", "Failed to upsert subscription — returning 500 for Stripe retry", { ...subCtx, dbError: subErr });
    return new Response(JSON.stringify({ error: "db_subscription_upsert_failed" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  const isPro = plan === "pro";
  const { error: entErr } = await supabase
    .from("entitlements")
    .upsert(
      {
        user_id: userId,
        can_view_full_history: isPro,
        can_access_programs: isPro,
        can_view_snapshot: isPro,
        can_receive_ai_summary: isPro,
        can_export_reports: isPro,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (entErr) {
    log("error", "Failed to upsert entitlements — returning 500 for Stripe retry", { ...subCtx, dbError: entErr });
    return new Response(JSON.stringify({ error: "db_entitlements_upsert_failed" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  if (status === "trialing" && matchesProPrice) {
    await supabase
      .from("profiles")
      .update({ has_used_trial: true })
      .eq("user_id", userId);
  }

  log("info", "Webhook processed successfully", { ...subCtx, plan, status });

  return new Response(
    JSON.stringify({ received: true, eventId: event.id, user_id: userId, plan, status }),
    { headers: { "Content-Type": "application/json" } }
  );
});
