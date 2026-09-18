import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPlatformCredentials, verifySubscriptionSignature } from "@/lib/razorpay/platform";
import { syncSubscription } from "@/lib/billing/sync";

/**
 * The browser's side of a completed subscription checkout.
 *
 * Razorpay signs the (payment id, subscription id) pair with the account's
 * secret, so a forged call can't get past this. Even so, the signature only
 * proves the pair is genuine — what the subscription actually is gets
 * re-fetched from Razorpay by syncSubscription, and that is what's written
 * down. The webhook does the same thing independently, so a buyer who closes
 * the tab still ends up with the right status.
 */
export async function POST(request: NextRequest) {
  let body: {
    razorpay_subscription_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const subscriptionId = body.razorpay_subscription_id;
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;
  if (!subscriptionId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
  }

  const credentials = getPlatformCredentials();
  if (!credentials) {
    return NextResponse.json({ error: "Billing isn't configured." }, { status: 501 });
  }

  if (
    !verifySubscriptionSignature({
      subscriptionId,
      paymentId,
      signature,
      keySecret: credentials.keySecret,
    })
  ) {
    console.warn(`[billing verify] signature mismatch for subscription ${subscriptionId}`);
    return NextResponse.json({ error: "That payment couldn't be verified." }, { status: 400 });
  }

  const synced = await syncSubscription(subscriptionId);
  if (!synced.ok) {
    console.error("[billing verify] sync failed:", synced.error);
    return NextResponse.json(
      { error: "Payment went through but we couldn't record it. Contact support." },
      { status: 500 },
    );
  }

  // Razorpay can report a subscription as still 'authenticated' for a moment
  // after the first charge; the webhook lands the 'active' state. Reported
  // honestly rather than claiming access that hasn't been granted yet.
  const supabase = createServiceRoleClient();
  const { data: creator } = await supabase
    .from("creators")
    .select("subscription_status, paid_until")
    .eq("id", synced.creatorId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    status: creator?.subscription_status ?? synced.status,
    paid_until: creator?.paid_until ?? null,
  });
}
