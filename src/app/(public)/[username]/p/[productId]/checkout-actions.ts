"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/dodo/checkout";
import { isDodoConfigured } from "@/lib/env";
import { COUPON_MESSAGES, quoteCheckout, type CheckoutQuote } from "@/lib/payments/pricing";

export interface BumpOffer {
  productId: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  priceCents: number;
  listPriceCents: number;
}

/** What the checkout modal shows before anything is ticked. */
export async function getCheckoutOffers(productId: string): Promise<BumpOffer[]> {
  const supabase = createServiceRoleClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, creator_id, currency, is_published")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !product.is_published) return [];

  const { data: offers } = await supabase
    .from("product_offers")
    .select("offer_product_id, discount_percent, position")
    .eq("primary_product_id", product.id)
    .eq("offer_type", "order_bump")
    .order("position", { ascending: true });
  if (!offers || offers.length === 0) return [];

  const { data: bumpProducts } = await supabase
    .from("products")
    .select("id, name, description, cover_image_url, price_cents, currency")
    .in(
      "id",
      offers.map((o) => o.offer_product_id),
    )
    .eq("creator_id", product.creator_id)
    .eq("is_published", true);

  const byId = new Map((bumpProducts ?? []).map((p) => [p.id, p]));

  return offers.flatMap((offer) => {
    const bump = byId.get(offer.offer_product_id);
    if (!bump || bump.currency !== product.currency) return [];
    return [
      {
        productId: bump.id,
        name: bump.name,
        description: bump.description,
        coverImageUrl: bump.cover_image_url,
        priceCents: bumpPrice(bump.price_cents, offer.discount_percent),
        listPriceCents: bump.price_cents,
      },
    ];
  });
}

function bumpPrice(listPriceCents: number, discountPercent: number | null): number {
  if (!discountPercent || discountPercent <= 0) return listPriceCents;
  return Math.max(0, Math.round(listPriceCents * (1 - Math.min(discountPercent, 100) / 100)));
}

export type QuoteActionResult =
  | { ok: true; quote: CheckoutQuote; couponMessage: string | null }
  | { ok: false; error: string };

/**
 * Prices what the buyer has selected. The modal shows what comes back here
 * and nothing it worked out itself, so the total on screen is the total the
 * payment routes will independently arrive at.
 */
export async function quoteSelection(
  productId: string,
  bumpProductIds: string[],
  couponCode: string | null,
): Promise<QuoteActionResult> {
  const result = await quoteCheckout({
    productId,
    bumpProductIds: Array.isArray(bumpProductIds) ? bumpProductIds.slice(0, 20) : [],
    couponCode: typeof couponCode === "string" ? couponCode.slice(0, 40) : null,
  });
  if (!result.ok) return result;

  return {
    ok: true,
    quote: result.quote,
    couponMessage: result.quote.couponRejected
      ? COUPON_MESSAGES[result.quote.couponRejected]
      : null,
  };
}

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
