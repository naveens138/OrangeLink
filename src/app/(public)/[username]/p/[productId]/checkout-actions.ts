"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/dodo/checkout";
import { isDodoConfigured } from "@/lib/env";

export type StartCheckoutResult =
  | { ok: true; checkoutUrl: string; sessionId: string }
  | { ok: false; error: string };

/**
 * Starts a Dodo checkout session for a public storefront purchase.
 *
 * Runs with the service role because the buyer is never authenticated — this
 * is the same public-read pattern used for the storefront itself (see
 * lib/queries/public-page.ts), scoped here to exactly the columns a checkout
 * needs.
 */
export async function startCheckout(
  productId: string,
  email: string,
  name: string,
  visitorId?: string,
): Promise<StartCheckoutResult> {
  if (!isDodoConfigured()) {
    return {
      ok: false,
      error: "Payments aren't connected yet for this creator.",
    };
  }
  if (!email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = createServiceRoleClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, creator_id, dodo_product_id, is_published")
    .eq("id", productId)
    .maybeSingle();

  if (!product || !product.is_published) {
    return { ok: false, error: "This product isn't available." };
  }
  if (!product.dodo_product_id) {
    return {
      ok: false,
      error: "This product hasn't finished syncing to payments yet. Try again shortly.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const session = await createCheckoutSession({
      dodoProductId: product.dodo_product_id,
      productId: product.id,
      creatorId: product.creator_id,
      visitorId,
      email,
      name,
      returnUrl: `${siteUrl}/checkout-complete`,
    });
    return { ok: true, checkoutUrl: session.checkoutUrl, sessionId: session.sessionId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Couldn't start checkout.",
    };
  }
}

export type OrderStatusResult =
  | { status: "pending" }
  | { status: "paid"; downloadUrl: string | null }
  | { status: "not_found" };

/**
 * Polled by the checkout modal after the inline iframe signals it's done.
 * Reads only what it writes back to the buyer — never fulfills anything
 * itself. The webhook (src/app/api/webhooks/dodo/route.ts) is what actually
 * creates the order; this just reports whether that has happened yet.
 */
export async function getOrderStatus(sessionId: string): Promise<OrderStatusResult> {
  const supabase = createServiceRoleClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("provider_checkout_session_id", sessionId)
    .maybeSingle();

  if (!order) return { status: "pending" };
  if (order.status !== "paid") return { status: "pending" };

  const { data: item } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", order.id)
    .limit(1)
    .maybeSingle();

  if (!item) return { status: "paid", downloadUrl: null };

  const { data: delivery } = await supabase
    .from("deliveries")
    .select("signed_url")
    .eq("order_item_id", item.id)
    .maybeSingle();

  return { status: "paid", downloadUrl: delivery?.signed_url ?? null };
}
