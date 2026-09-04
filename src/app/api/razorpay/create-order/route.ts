import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createRazorpayClient } from "@/lib/razorpay/client";
import { isRazorpayConfigured } from "@/lib/env";
import type { INormalizeError } from "razorpay/dist/types/api";

/**
 * Creates a Razorpay order for a public storefront purchase.
 *
 * Runs with the service role because the buyer is never authenticated — the
 * same pattern as the Dodo equivalent (checkout-actions.ts's startCheckout).
 * This is a route handler rather than a server action because the frontend
 * calls it directly via fetch() from inside the Razorpay checkout.js flow,
 * not from a form submission.
 */
export async function POST(request: NextRequest) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Payments aren't connected yet for this creator." },
      { status: 501 },
    );
  }

  let body: { productId?: string; email?: string; name?: string; visitorId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { productId, email, name, visitorId } = body;
  if (!productId || !email || !email.includes("@")) {
    return NextResponse.json(
      { error: "A product and a valid email are required." },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, creator_id, name, price_cents, currency, is_published")
    .eq("id", productId)
    .maybeSingle();

  if (!product || !product.is_published) {
    return NextResponse.json({ error: "This product isn't available." }, { status: 404 });
  }

  // Razorpay's stated minimum is 100 in the currency's smallest unit (₹1 for
  // INR); enforced here so a misconfigured ₹0.50 product fails with a clear
  // message instead of a cryptic Razorpay API error.
  if (product.price_cents < 100) {
    return NextResponse.json(
      { error: "This product's price is below the minimum payable amount." },
      { status: 400 },
    );
  }

  try {
    const razorpay = createRazorpayClient();
    const order = await razorpay.orders.create({
      amount: product.price_cents,
      currency: product.currency,
      // Razorpay caps receipt at 40 characters and requires uniqueness.
      receipt: `ol_${productId.slice(0, 8)}_${Date.now()}`,
      // Canonical record of what was actually purchased and by whom — read
      // back by /api/razorpay/verify-payment via razorpay.orders.fetch()
      // rather than trusted from the client at verification time.
      notes: {
        orangelink_product_id: product.id,
        orangelink_creator_id: product.creator_id,
        orangelink_visitor_id: visitorId ?? "",
        email,
        name: name || email,
      },
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      product_name: product.name,
    });
  } catch (error) {
    const rzpError = error as Partial<INormalizeError>;
    if (rzpError?.statusCode === 401) {
      return NextResponse.json(
        { error: "Payment provider rejected our credentials." },
        { status: 401 },
      );
    }
    console.error("[razorpay create-order] failed:", error);
    return NextResponse.json(
      { error: rzpError?.error?.description ?? "Couldn't start checkout." },
      { status: 500 },
    );
  }
}
