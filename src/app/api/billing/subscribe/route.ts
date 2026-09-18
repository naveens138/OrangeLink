import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { createPlatformRazorpayClient, getPlatformCredentials } from "@/lib/razorpay/platform";
import { getEntitlement } from "@/lib/billing/entitlement";
import { isBillingInterval, PLANS, planIdFor } from "@/lib/billing/plans";

/**
 * Starts a plan subscription for the signed-in creator.
 *
 * The account comes from the session, never from the request body — a
 * creator can only ever subscribe themselves. The response carries the
 * subscription id and the publishable key so checkout.js can open; nothing
 * here grants access, which only happens once money actually moves (see
 * /api/billing/verify and the webhook).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();
  if (!creator) {
    return NextResponse.json(
      { error: "Claim your username before subscribing." },
      { status: 409 },
    );
  }

  let body: { interval?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const interval = body.interval;
  if (!isBillingInterval(interval)) {
    return NextResponse.json({ error: "Pick a monthly or annual plan." }, { status: 400 });
  }

  const credentials = getPlatformCredentials();
  const planId = planIdFor(interval);
  const razorpay = createPlatformRazorpayClient();
  if (!credentials || !planId || !razorpay) {
    // Billing isn't switched on yet: no keys, or the plans haven't been
    // created. Honest 501 rather than a broken checkout.
    return NextResponse.json(
      { error: "Billing isn't available just yet. Check back shortly." },
      { status: 501 },
    );
  }

  const entitlement = await getEntitlement(creator.id);
  if (entitlement.subscriptionStatus === "active") {
    return NextResponse.json(
      { error: "You're already subscribed." },
      { status: 409 },
    );
  }

  // Someone subscribing during a free period, whether that's a trial or a
  // Creator Program year, shouldn't pay for time they already have: the
  // subscription is dated to begin the day it ends, which is also what turns
  // the prompt at the end into a one-click thing rather than a surprise.
  const startAt =
    entitlement.onFreePeriod && entitlement.grantEndsAt
      ? Math.floor(entitlement.grantEndsAt.getTime() / 1000)
      : undefined;

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: PLANS[interval].totalCount,
      customer_notify: 1,
      ...(startAt ? { start_at: startAt } : {}),
      notes: {
        orangelink_creator_id: creator.id,
        orangelink_username: creator.username,
        orangelink_interval: interval,
      },
    });

    // Recorded before the buyer sees checkout, so an abandoned attempt is
    // still traceable. Status is Razorpay's own 'created' — no access.
    const service = createServiceRoleClient();
    await service.from("platform_subscriptions").upsert(
      {
        id: subscription.id,
        creator_id: creator.id,
        plan_id: planId,
        billing_interval: interval,
        status: String(subscription.status ?? "created"),
        start_at: startAt ? new Date(startAt * 1000).toISOString() : null,
        short_url: subscription.short_url ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    return NextResponse.json({
      subscription_id: subscription.id,
      key_id: credentials.keyId,
      starts_at: startAt ?? null,
    });
  } catch (error) {
    console.error("[billing subscribe] failed:", error);
    return NextResponse.json({ error: "Couldn't start the subscription." }, { status: 500 });
  }
}
