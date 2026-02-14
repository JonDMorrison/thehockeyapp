import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Structured log helper — always includes event context */
function log(
  level: "info" | "warn" | "error",
  msg: string,
  ctx: Record<string, unknown> = {}
) {
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

  // ─── Env validation ───
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    log("error", "STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const proPriceIds: string[] = [];
  const cadPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID_CAD_LIVE");
  const usdPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID_USD_LIVE");
  if (cadPriceId) proPriceIds.push(cadPriceId);
  if (usdPriceId) proPriceIds.push(usdPriceId);

  // Team plan price IDs
  const teamPriceIds: string[] = [];
  const teamCadPriceId = Deno.env.get("STRIPE_TEAM_PRICE_ID_CAD_LIVE");
  const teamUsdPriceId = Deno.env.get("STRIPE_TEAM_PRICE_ID_USD_LIVE");
  if (teamCadPriceId) teamPriceIds.push(teamCadPriceId);
  if (teamUsdPriceId) teamPriceIds.push(teamUsdPriceId);

  if (proPriceIds.length === 0) {
    log("error", "No Pro price IDs configured (STRIPE_PRO_PRICE_ID_CAD_LIVE / USD_LIVE)");
    return new Response("Price IDs not configured", { status: 500 });
  }

  const allowTrials = Deno.env.get("ALLOW_TRIALS") === "true";

  // ─── Signature verification (unchanged) ───
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    log("error", "Webhook signature verification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : "Unknown"}`, {
      status: 400,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const eventCtx = { eventId: event.id, eventType: event.type };

  // Only handle relevant events
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
  // Seed stripe_customer_id → user_id mapping so subscription events
  // can resolve the user without relying on email lookup.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const refUserId = session.client_reference_id || session.metadata?.user_id;
    const sessionCustomerId = session.customer as string | null;

    log("info", "Checkout completed", {
      ...eventCtx,
      sessionId: session.id,
      customer: sessionCustomerId,
      subscription: session.subscription,
      refUserId,
    });

    if (refUserId && sessionCustomerId) {
      // Pre-seed the subscriptions row so subsequent subscription events
      // can be resolved via stripe_customer_id → user_id.
      const { error: seedErr } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: refUserId,
            stripe_customer_id: sessionCustomerId,
            stripe_subscription_id: (session.subscription as string) || null,
            status: "active",
            plan: "free", // Will be corrected by the subscription.created event
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (seedErr) {
        log("error", "Failed to seed subscription from checkout", {
          ...eventCtx,
          refUserId,
          customerId: sessionCustomerId,
          dbError: seedErr,
        });
        return new Response(
          JSON.stringify({ error: "db_checkout_seed_failed", eventId: event.id }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
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
    log("error", "Payment failed", {
      ...eventCtx,
      invoiceId: invoice.id,
      customerId,
      attemptCount: invoice.attempt_count,
    });

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
          message:
            "Your subscription payment failed. Please update your payment method to keep your Pro features.",
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

  // Resolve user_id: prefer DB lookup by stripe_customer_id, fall back to email
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
    // Fallback: email lookup
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !("email" in customer) || !customer.email) {
      log("error", "Customer deleted or no email", { ...eventCtx, customerId });
      return new Response(JSON.stringify({ received: true, error: "no_email" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", customer.email)
      .maybeSingle();

    if (profileErr || !profile) {
      log("error", "No profile found for email", { ...eventCtx, email: customer.email, profileErr });
      return new Response(JSON.stringify({ received: true, error: "no_user" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    userId = profile.user_id;
    log("info", "Resolved user via email fallback", { ...eventCtx, customerId, userId, email: customer.email });
  }

  const subCtx = { ...eventCtx, userId, customerId, subscriptionId: subscription.id };

  // ─── Status mapping ───
  const mapStatus = (s: string): string => {
    switch (s) {
      case "active":
        return "active";
      case "trialing":
        return "trialing";
      case "past_due":
        return "past_due";
      case "canceled":
      case "unpaid":
      case "incomplete_expired":
        return "cancelled";
      default:
        return "cancelled";
    }
  };

  const status = mapStatus(subscription.status);

  // ─── Plan mapping: validate against known Pro price IDs ───
  const subscriptionPriceIds = (subscription.items?.data || []).map(
    (item: { price: { id: string } }) => item.price.id
  );
  const matchesProPrice = subscriptionPriceIds.some((pid: string) => proPriceIds.includes(pid));

  if (!matchesProPrice && (status === "active" || status === "trialing")) {
    log("warn", "Active subscription does not match any known Pro price ID", {
      ...subCtx,
      subscriptionPriceIds,
      configuredProPriceIds: proPriceIds,
    });
  }

  // Determine plan: must match price AND have valid status
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

  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  // ─── Upsert subscriptions table ───
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
    log("error", "Failed to upsert subscription — returning 500 for Stripe retry", {
      ...subCtx,
      dbError: subErr,
    });
    return new Response(
      JSON.stringify({ error: "db_subscription_upsert_failed", eventId: event.id }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // ─── Upsert entitlements table (only if subscription upsert succeeded) ───
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
    log("error", "Failed to upsert entitlements — returning 500 for Stripe retry", {
      ...subCtx,
      dbError: entErr,
    });
    return new Response(
      JSON.stringify({ error: "db_entitlements_upsert_failed", eventId: event.id }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // ─── Mark trial as used (idempotent) ───
  if (status === "trialing" && matchesProPrice) {
    const { error: trialErr } = await supabase
      .from("profiles")
      .update({ has_used_trial: true })
      .eq("user_id", userId);

    if (trialErr) {
      log("warn", "Failed to set has_used_trial flag", { ...subCtx, dbError: trialErr });
      // Non-fatal: trial already started, don't block webhook
    }
  }

  log("info", "Webhook processed successfully", { ...subCtx, plan, status });

  return new Response(
    JSON.stringify({ received: true, eventId: event.id, user_id: userId, plan, status }),
    { headers: { "Content-Type": "application/json" } }
  );
});
