import { NextResponse, type NextRequest } from "next/server";
import {
  createRazorpayClientFor,
  getCreatorPaymentCredentials,
  verifyRazorpayWebhookSignature,
} from "@/lib/razorpay/client";
import { fulfillOrder } from "@/lib/payments/fulfill-order";

/**
 * Server-to-server safety net alongside /api/razorpay/verify-payment.
 *
 * verify-payment already fulfils synchronously from the browser's
 * checkout.js callback — this exists for when that callback never fires
 * (tab closed mid-redirect, network drop, client JS error) but the payment
 * genuinely captured.
 *
 * The creator is in the path because each one now sells on their own
 * Razorpay account with their own webhook secret, so there is no single
 * secret that could verify every delivery. Each creator registers
 * /api/webhooks/razorpay/<their id> in their own dashboard.
 *
 * Both paths converge on the same fulfillOrder() (unique index on
 * orders.provider_payment_id), so whichever arrives first fulfils and the
 * other hits the idempotent "alreadyProcessed" branch.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> },
) {
  const { creatorId } = await params;

  const credentials = await getCreatorPaymentCredentials(creatorId);
  if (!credentials?.webhookSecret) {
    // Either an unknown creator, or one who hasn't registered a webhook.
    // Deliberately the same response for both: this endpoint is public, and
    // distinguishing them would confirm which creator ids exist.
    return NextResponse.json({ error: "Not configured." }, { status: 404 });
  }

  const signature = request.headers.get("x-razorpay-signature") ?? "";
  // Raw text, never request.json() then re-stringify — re-serializing can
  // reorder or reformat bytes and produce a different signature than the one
  // Razorpay actually computed over the original body.
  const rawBody = await request.text();
  if (!signature || !rawBody) {
    return NextResponse.json({ error: "Missing signature or body." }, { status: 400 });
  }

  if (!verifyRazorpayWebhookSignature(rawBody, signature, credentials.webhookSecret)) {
    console.warn(`[razorpay webhook] signature mismatch for creator ${creatorId}`);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Subscribing to more events than we act on is fine — anything that isn't
  // a captured payment is a no-op rather than an error.
  if (event.event !== "payment.captured") {
    return NextResponse.json({ received: true });
  }

  const paymentId = event.payload?.payment?.entity?.id;
  const orderId = event.payload?.payment?.entity?.order_id;
  if (!paymentId || !orderId) {
    return NextResponse.json({ error: "Malformed payment.captured payload." }, { status: 400 });
  }

  try {
    // The signature only proves the notification genuinely came from this
    // creator's Razorpay account, not what was purchased — re-fetch the
    // order for the authoritative notes.
    const razorpay = createRazorpayClientFor(credentials);
    const order = await razorpay.orders.fetch(orderId);
    const notes = order.notes as Record<string, string> | undefined;

    const productId = String(notes?.orangelink_product_id ?? "");
    const notedCreatorId = String(notes?.orangelink_creator_id ?? "");
    const visitorId = notes?.orangelink_visitor_id || null;
    const email = String(notes?.email ?? "");
    const name = String(notes?.name ?? email);

    if (!productId || !notedCreatorId || !email) {
      // Not an order OrangeLink created (e.g. a test event fired from the
      // Razorpay dashboard) — nothing to fulfil, and retrying won't help.
      console.warn(
        `[razorpay webhook] payment.captured ${paymentId} has no orangelink notes, skipping`,
      );
      return NextResponse.json({ received: true });
    }

    // A creator's webhook may only ever fulfil that creator's own orders.
    if (notedCreatorId !== creatorId) {
      console.warn(
        `[razorpay webhook] creator ${creatorId} sent an order belonging to ${notedCreatorId}`,
      );
      return NextResponse.json({ error: "Order does not belong to this account." }, { status: 400 });
    }

    const result = await fulfillOrder({
      productId,
      creatorId: notedCreatorId,
      visitorId,
      email,
      name,
      amountCents: Number(order.amount),
      currency: String(order.currency),
      provider: "razorpay",
      providerPaymentId: paymentId,
      providerCheckoutSessionId: orderId,
    });

    if (!result.ok) {
      console.error("[razorpay webhook] fulfillment failed:", result.error);
      return NextResponse.json({ error: "Fulfillment failed." }, { status: 500 });
    }
    if (result.alreadyProcessed) {
      console.info(`[razorpay webhook] payment ${paymentId} already processed`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[razorpay webhook] failed:", error);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
