import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyPlatformWebhookSignature } from "@/lib/razorpay/platform";
import { syncSubscription } from "@/lib/billing/sync";

/**
 * Razorpay's server-to-server account of what happened to a plan
 * subscription, and the reason subscription status can be trusted at all:
 * the browser never gets a say, and /api/billing/verify only covers the one
 * moment a buyer is still on the page.
 *
 * Registered once in OrangeLink's own Razorpay dashboard against
 * RAZORPAY_PLATFORM_WEBHOOK_SECRET — unlike the storefront webhook, which is
 * per creator because each creator has their own account and secret.
 *
 * Every event is handled the same way: re-fetch the subscription from
 * Razorpay and write down what it says. The payload is signed and could be
 * trusted, but re-reading means a retry that arrives out of order can't
 * write a stale status over a newer one.
 */

// Subscribed events we act on. Anything else is acknowledged and ignored, so
// adding an event in the Razorpay dashboard can never start failing
// deliveries here.
const HANDLED = new Set([
  "subscription.charged",
  "subscription.cancelled",
  "subscription.halted",
  "subscription.activated",
  "subscription.pending",
  "subscription.completed",
  "subscription.updated",
  "subscription.paused",
  "subscription.resumed",
]);

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  // Raw text, never re-serialized: re-stringifying can reorder bytes and
  // produce a different signature than the one Razorpay computed.
  const rawBody = await request.text();
  if (!signature || !rawBody) {
    return NextResponse.json({ error: "Missing signature or body." }, { status: 400 });
  }

  if (!verifyPlatformWebhookSignature(rawBody, signature)) {
    console.warn("[platform webhook] signature mismatch");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { subscription?: { entity?: { id?: string } } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const eventType = String(event.event ?? "");
  if (!HANDLED.has(eventType)) {
    return NextResponse.json({ received: true });
  }

  const subscriptionId = event.payload?.subscription?.entity?.id;
  if (!subscriptionId) {
    return NextResponse.json({ error: "Malformed subscription payload." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Razorpay retries until it gets a 2xx, with the same event id each time.
  // An event we've already applied is acknowledged and dropped.
  const eventId = request.headers.get("x-razorpay-event-id");
  if (eventId) {
    const { data: seen } = await supabase
      .from("platform_billing_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (seen) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  const synced = await syncSubscription(subscriptionId);
  if (!synced.ok) {
    console.error(`[platform webhook] ${eventType} for ${subscriptionId}:`, synced.error);
    // 500 so Razorpay retries — a transient Razorpay or database failure
    // shouldn't quietly leave someone's access wrong. Deliberately without
    // recording the event: marking it seen before it applied would turn the
    // retry into a no-op and strand the status.
    return NextResponse.json({ error: "Couldn't apply that event." }, { status: 500 });
  }

  // Recorded only now that it has actually been applied. Two deliveries
  // racing each other can both get this far, which is harmless: syncing
  // re-reads the subscription from Razorpay and writes what it says rather
  // than incrementing anything, so applying it twice lands the same state.
  if (eventId) {
    const { error: recordError } = await supabase
      .from("platform_billing_events")
      .insert({ event_id: eventId, event_type: eventType, subscription_id: subscriptionId });
    if (recordError && recordError.code !== "23505") {
      console.error("[platform webhook] couldn't record event:", recordError.message);
    }
  }

  console.info(
    `[platform webhook] ${eventType} → ${synced.razorpayStatus} for creator ${synced.creatorId}`,
  );
  return NextResponse.json({ received: true });
}
