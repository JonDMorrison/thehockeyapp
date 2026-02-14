import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * stripe-webhook
 *
 * Webhook-only architecture for subscription management.
 * - Verifies Stripe signature (NOT JWT — webhooks come from Stripe, not users)
 * - Idempotent: upserts by user_id, ignores duplicate events
 * - Updates both `subscriptions` and `entitlements` tables
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : "Unknown"}`, {
      status: 400,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Only handle subscription-related events
  const relevantEvents = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ];

  if (!relevantEvents.includes(event.type)) {
    return new Response(JSON.stringify({ received: true, ignored: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  // Resolve customer email → user_id
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !("email" in customer) || !customer.email) {
    console.error("Customer deleted or no email:", customerId);
    return new Response(JSON.stringify({ received: true, error: "no_email" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Find user by email
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("email", customer.email)
    .maybeSingle();

  if (profileErr || !profile) {
    console.error("No profile found for email:", customer.email, profileErr);
    return new Response(JSON.stringify({ received: true, error: "no_user" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = profile.user_id;

  // Map Stripe status → our status
  const mapStatus = (s: string): string => {
    switch (s) {
      case "active":
      case "trialing":
        return "active";
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
  const plan = status === "active" ? "pro" : "free";
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  // ─── Upsert subscriptions table (idempotent) ───
  const { error: subErr } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        status,
        plan,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (subErr) {
    console.error("Failed to upsert subscription:", subErr);
  }

  // ─── Upsert entitlements table (idempotent) ───
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
    console.error("Failed to upsert entitlements:", entErr);
  }

  console.log(`Webhook processed: ${event.type} for user ${userId}, plan=${plan}, status=${status}`);

  return new Response(JSON.stringify({ received: true, user_id: userId, plan, status }), {
    headers: { "Content-Type": "application/json" },
  });
});
