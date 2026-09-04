import { NextResponse, type NextRequest } from "next/server";
import { getPaddleInstance } from "@/lib/paddle/client";
import { processPaddleEvent } from "@/lib/paddle/process-webhook";

/**
 * Receives Paddle subscription/customer webhooks and mirrors them into
 * paddle_customers/paddle_subscriptions (migrations/0008) — same
 * "never trust the client, verify server-side" discipline as the Dodo and
 * Razorpay payment paths (src/app/api/webhooks/dodo,
 * src/app/api/razorpay/verify-payment): nothing here is fulfilled or
 * marked active until Paddle's own signed event says so.
 *
 * unmarshal() throws indistinguishably for a tampered request, a wrong or
 * rotated secret, an expired timestamp, and a malformed event — deliberately
 * one catch, one non-2xx status, for the whole thing (see the `webhooks`
 * Paddle skill). Paddle retries any non-2xx for up to 3 days; only a 2xx
 * marks an event delivered, so returning 2xx on a failure is the one
 * mistake that actually loses events — never do that here.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Paddle webhooks are not configured (PADDLE_NOTIFICATION_WEBHOOK_SECRET unset)." },
      { status: 501 },
    );
  }

  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();
  if (!signature || !rawBody) {
    return NextResponse.json({ error: "Missing signature or body." }, { status: 400 });
  }

  try {
    const paddle = getPaddleInstance();
    // Verifies the HMAC signature in the paddle-signature header against
    // the raw body, then returns a typed event — never parse the body as
    // JSON before this, re-serializing it produces a different byte
    // sequence than what Paddle actually signed.
    const event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
    if (event) {
      await processPaddleEvent(event);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[paddle webhook] failed:", error);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
