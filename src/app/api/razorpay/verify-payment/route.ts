import { NextResponse, type NextRequest } from "next/server";
import {
  createRazorpayClientFor,
  getCreatorPaymentCredentials,
  verifyRazorpayPaymentSignature,
} from "@/lib/razorpay/client";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fulfillOrder } from "@/lib/payments/fulfill-order";
import { quoteCheckout } from "@/lib/payments/pricing";

/**
 * Verifies a Razorpay Standard Checkout payment and fulfills the order.
 *
 * Razorpay's signature is verifiable synchronously, so this route both
 * verifies AND fulfills in one round trip and the frontend gets the
 * download link directly instead of polling.
 *
 * Since each creator sells on their own account, the signature has to be
 * checked against *their* secret. The productId in the body is only a hint
 * for finding which account to check against — it grants nothing on its
 * own: a wrong or forged productId points at the wrong secret, the
 * signature fails, and the order is never fulfilled. The authoritative
 * details are still re-read from Razorpay afterwards.
 */
export async function POST(request: NextRequest) {
  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    productId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, productId } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !productId) {
    return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, creator_id")
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Unknown product." }, { status: 404 });
  }

  const credentials = await getCreatorPaymentCredentials(product.creator_id);
  if (!credentials) {
    return NextResponse.json(
      { error: "This creator hasn't set up payments yet." },
      { status: 501 },
    );
  }

  const signatureValid = verifyRazorpayPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
    keySecret: credentials.keySecret,
  });

  // A mismatch means this did not genuinely come from Razorpay for this
  // creator's account (or was tampered with) — never marked paid on this path.
  if (!signatureValid) {
    console.warn(
      `[razorpay verify] signature mismatch for order ${razorpay_order_id}`,
    );
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  // The signature proves the ids are genuine, not what was purchased —
  // re-fetch the order so a tampered body can't redirect fulfillment to a
  // different product than what was actually paid for.
  let notedProductId: string;
  let creatorId: string;
  let visitorId: string | null;
  let email: string;
  let name: string;
  let amountCents: number;
  let currency: string;
  let bumpProductIds: string[];
  let couponCode: string | null;

  try {
    const razorpay = createRazorpayClientFor(credentials);
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const notes = order.notes as Record<string, string> | undefined;

    notedProductId = String(notes?.orangelink_product_id ?? "");
    creatorId = String(notes?.orangelink_creator_id ?? "");
    visitorId = notes?.orangelink_visitor_id || null;
    email = String(notes?.email ?? "");
    name = String(notes?.name ?? email);
    amountCents = Number(order.amount);
    currency = order.currency;
    bumpProductIds = String(notes?.orangelink_bump_ids ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    couponCode = String(notes?.orangelink_coupon_code ?? "") || null;
  } catch (error) {
    console.error("[razorpay verify] order fetch failed:", error);
    return NextResponse.json({ error: "Couldn't confirm this order." }, { status: 500 });
  }

  if (!notedProductId || !creatorId || !email) {
    return NextResponse.json(
      { error: "This order has no OrangeLink product attached." },
      { status: 400 },
    );
  }

  // The order Razorpay returned must be for the product we verified against.
  if (notedProductId !== product.id || creatorId !== product.creator_id) {
    console.warn(
      `[razorpay verify] order ${razorpay_order_id} does not match product ${product.id}`,
    );
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  // Re-priced from the ids in the notes rather than read out of them, so the
  // order rows record what these products and this code are actually worth.
  // The buyer paid what Razorpay says they paid, so that stays the total;
  // a mismatch means the pricing moved between checkout and payment and is
  // worth knowing about, but it never blocks a sale that already happened.
  const quoted = await quoteCheckout({
    productId: notedProductId,
    bumpProductIds,
    couponCode,
  });
  const quote = quoted.ok ? quoted.quote : null;
  if (quote && quote.totalCents !== amountCents) {
    console.warn(
      `[razorpay verify] order ${razorpay_order_id} charged ${amountCents} but re-quotes at ${quote.totalCents}`,
    );
  }

  const result = await fulfillOrder({
    productId: notedProductId,
    creatorId,
    visitorId,
    email,
    name,
    amountCents,
    currency,
    provider: "razorpay",
    providerPaymentId: razorpay_payment_id,
    providerCheckoutSessionId: razorpay_order_id,
    items: quote?.lines.map((line) => ({
      productId: line.productId,
      unitPriceCents: line.unitPriceCents,
      isOrderBump: line.isOrderBump,
    })),
    subtotalCents: quote?.subtotalCents,
    discountCents: quote?.discountCents,
    couponId: quote?.coupon?.id ?? null,
  });

  if (!result.ok) {
    console.error("[razorpay verify] fulfillment failed:", result.error);
    return NextResponse.json(
      { error: "Payment succeeded but the order couldn't be recorded. Contact support." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    downloadUrl: result.downloadUrl,
    downloads: result.downloads,
  });
}
