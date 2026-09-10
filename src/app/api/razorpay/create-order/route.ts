import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  createRazorpayClientFor,
  getCreatorPaymentCredentials,
} from "@/lib/razorpay/client";
import type { INormalizeError } from "razorpay/dist/types/api";

/**
 * Creates a Razorpay order for a public storefront purchase, on the
 * creator's own Razorpay account.
 *
 * Runs with the service role because the buyer is never authenticated. The
 * creator's key_id comes back in the response because Razorpay's
 * checkout.js needs it in the browser — the secret never leaves the server.
 */
export async function POST(request: NextRequest) {
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

  // Each creator sells through their own account, so a creator who hasn't
  // connected one yet simply cannot take payments — there is no platform
  // account to fall back to, by design.
  const credentials = await getCreatorPaymentCredentials(product.creator_id);
  if (!credentials) {
    return NextResponse.json(
      { error: "This creator hasn't set up payments yet." },
      { status: 501 },
    );
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
    const razorpay = createRazorpayClientFor(credentials);
    const order = await razorpay.orders.create({
      amount: product.price_cents,
      currency: product.currency,
      // Razorpay caps receipt at 40 characters and requires uniqueness.
      receipt: `ol_${productId.slice(0, 8)}_${Date.now()}`,
      // Canonical record of what was actually purchased and by whom — read
      // back at verification time via razorpay.orders.fetch() rather than
      // trusted from the client.
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
      // The creator's publishable key — checkout.js is opened against their
      // account, not ours.
      key_id: credentials.keyId,
    });
  } catch (error) {
    const rzpError = error as Partial<INormalizeError>;
    if (rzpError?.statusCode === 401) {
      return NextResponse.json(
        { error: "This creator's payment credentials were rejected." },
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
