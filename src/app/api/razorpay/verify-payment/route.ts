import { NextResponse, type NextRequest } from "next/server";
import { createRazorpayClient, verifyRazorpayPaymentSignature } from "@/lib/razorpay/client";
import { fulfillOrder } from "@/lib/payments/fulfill-order";
import { isRazorpayConfigured } from "@/lib/env";

/**
 * Verifies a Razorpay Standard Checkout payment and fulfills the order.
 *
 * Unlike Dodo (which fulfills asynchronously from a server-to-server
 * webhook), Razorpay's signature is verifiable synchronously right here —
 * so this route both verifies AND fulfills in one round trip, and the
 * frontend gets the download link directly in the response instead of
 * polling.
 */
export async function POST(request: NextRequest) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Payments aren't connected yet for this creator." },
      { status: 501 },
    );
  }

  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
  }

  const signatureValid = verifyRazorpayPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  // A signature mismatch means this request did not genuinely come from
  // Razorpay (or was tampered with in transit) — the order is never marked
  // paid on this path, regardless of what the client claims happened.
  if (!signatureValid) {
    console.warn(
      `[razorpay verify] signature mismatch for order ${razorpay_order_id}`,
    );
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  // The signature only proves payment_id/order_id are genuine, not what was
  // actually purchased — re-fetch the order from Razorpay rather than
  // trusting client-supplied product/creator ids, so a tampered request body
  // can't redirect fulfillment to a different product than what was paid for.
  let productId: string;
  let creatorId: string;
  let visitorId: string | null;
  let email: string;
  let name: string;
  let amountCents: number;
  let currency: string;

  try {
    const razorpay = createRazorpayClient();
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const notes = order.notes as Record<string, string> | undefined;

    productId = String(notes?.orangelink_product_id ?? "");
    creatorId = String(notes?.orangelink_creator_id ?? "");
    visitorId = notes?.orangelink_visitor_id || null;
    email = String(notes?.email ?? "");
    name = String(notes?.name ?? email);
    amountCents = Number(order.amount);
    currency = order.currency;
  } catch (error) {
    console.error("[razorpay verify] order fetch failed:", error);
    return NextResponse.json({ error: "Couldn't confirm this order." }, { status: 500 });
  }

  if (!productId || !creatorId || !email) {
    return NextResponse.json(
      { error: "This order has no OrangeLink product attached." },
      { status: 400 },
    );
  }

  const result = await fulfillOrder({
    productId,
    creatorId,
    visitorId,
    email,
    name,
    amountCents,
    currency,
    provider: "razorpay",
    providerPaymentId: razorpay_payment_id,
    providerCheckoutSessionId: razorpay_order_id,
  });

  if (!result.ok) {
    console.error("[razorpay verify] fulfillment failed:", result.error);
    return NextResponse.json(
      { error: "Payment succeeded but the order couldn't be recorded. Contact support." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, downloadUrl: result.downloadUrl });
}
