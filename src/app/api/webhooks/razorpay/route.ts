import { NextResponse, type NextRequest } from "next/server";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import { createRazorpayClient } from "@/lib/razorpay/client";
import { fulfillOrder } from "@/lib/payments/fulfill-order";

/**
 * Server-to-server safety net alongside /api/razorpay/verify-payment.
 *
 * verify-payment already verifies+fulfills synchronously from the browser's
 * checkout.js success callback — this route exists for the case that
 * callback never fires at all (tab closed mid-redirect, network drop,
 * client JS error) but the payment genuinely captured. Razorpay's own
 * webhook is the server-to-server confirmation that doesn't depend on the
 * buyer's browser still being there.
 *
 * Both paths converge on the same fulfillOrder() (migrations/0003's unique
 * index on orders.provider_payment_id), so whichever fires first fulfills
 * the order and the other one just hits the idempotent "alreadyProcessed"
 * branch — never a double-fulfillment, regardless of delivery order.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Razorpay webhooks are not configured (RAZORPAY_WEBHOOK_SECRET unset)." },
      { status: 501 },
    );
  }

  const signature = request.headers.get("x-razorpay-signature") ?? "";
  // Raw text, never request.json() then re-stringify — re-serializing can
  // reorder/reformat bytes and produce a different signature than the one
  // Razorpay actually computed over the original body.
  const rawBody = await request.text();
  if (!signature || !rawBody) {
    return NextResponse.json({ error: "Missing signature or body." }, { status: 400 });
  }

  let signatureValid: boolean;
  try {
    signatureValid = validateWebhookSignature(rawBody, signature, secret);
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) {
    console.warn("[razorpay webhook] signature mismatch");
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

  // Subscribed to more events than we act on may arrive here later — no-op
  // rather than an error for anything that isn't a captured payment.
  if (event.event !== "payment.captured") {
    return NextResponse.json({ received: true });
  }

  const paymentId = event.payload?.payment?.entity?.id;
  const orderId = event.payload?.payment?.entity?.order_id;
  if (!paymentId || !orderId) {
    return NextResponse.json({ error: "Malformed payment.captured payload." }, { status: 400 });
  }

  try {
    // The signature only proves this notification genuinely came from
    // Razorpay, not what was actually purchased — re-fetch the order from
    // Razorpay's own API for the authoritative notes, same as
    // verify-payment does, rather than trusting whatever the webhook
    // payload's own notes field happens to contain.
    const razorpay = createRazorpayClient();
    const order = await razorpay.orders.fetch(orderId);
    const notes = order.notes as Record<string, string> | undefined;

    const productId = String(notes?.orangelink_product_id ?? "");
    const creatorId = String(notes?.orangelink_creator_id ?? "");
    const visitorId = notes?.orangelink_visitor_id || null;
    const email = String(notes?.email ?? "");
    const name = String(notes?.name ?? email);

    if (!productId || !creatorId || !email) {
      // Not an order OrangeLink created (e.g. a test event fired from the
      // Razorpay dashboard) — nothing to fulfill, and retrying won't help.
      console.warn(
        `[razorpay webhook] payment.captured ${paymentId} has no orangelink notes — skipping`,
      );
      return NextResponse.json({ received: true });
    }

    const result = await fulfillOrder({
      productId,
      creatorId,
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
