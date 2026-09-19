import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * The one place that decides what a checkout costs.
 *
 * Every price, bump discount and coupon is read from the database here —
 * nothing about money is ever taken from the request. The buyer's browser
 * says only *which* product, *which* bumps and *which* code; this module
 * says what that adds up to. create-order, the free-claim route and
 * fulfillment all quote through it, so the amount charged, the amount
 * recorded and the amount shown in the modal cannot drift apart.
 */

// Razorpay won't take less than 1.00 in any currency. A coupon that lands
// between free and that minimum is refused rather than silently rounded,
// since either direction would mean charging something nobody agreed to.
const MIN_CHARGEABLE_CENTS = 100;

export interface QuoteLine {
  productId: string;
  name: string;
  /** What this line actually costs, after any bump discount. */
  unitPriceCents: number;
  /** The product's own price, for showing a struck-through "was". */
  listPriceCents: number;
  isOrderBump: boolean;
}

export type CouponRejection =
  | "unknown"
  | "expired"
  | "used_up"
  | "wrong_product"
  | "below_minimum";

export interface CheckoutQuote {
  creatorId: string;
  currency: string;
  lines: QuoteLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  coupon: { id: string; code: string } | null;
  /** Set when a code was supplied but not applied; the quote is still valid at full price. */
  couponRejected: CouponRejection | null;
}

export type QuoteResult =
  | { ok: true; quote: CheckoutQuote }
  | { ok: false; error: string };

export interface QuoteInput {
  productId: string;
  /** Ids of bumps the buyer ticked; anything not genuinely offered is ignored. */
  bumpProductIds?: string[];
  couponCode?: string | null;
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().slice(0, 40);
}

export async function quoteCheckout(input: QuoteInput): Promise<QuoteResult> {
  const supabase = createServiceRoleClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, creator_id, name, price_cents, currency, is_published")
    .eq("id", input.productId)
    .maybeSingle();

  if (!product || !product.is_published) {
    return { ok: false, error: "This product isn't available." };
  }

  const lines: QuoteLine[] = [
    {
      productId: product.id,
      name: product.name,
      unitPriceCents: product.price_cents,
      listPriceCents: product.price_cents,
      isOrderBump: false,
    },
  ];

  for (const bump of await resolveBumps(supabase, product, input.bumpProductIds ?? [])) {
    lines.push(bump);
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents, 0);

  let coupon: CheckoutQuote["coupon"] = null;
  let couponRejected: CouponRejection | null = null;
  let discountCents = 0;

  const code = input.couponCode ? normalizeCouponCode(input.couponCode) : "";
  if (code) {
    const applied = await applyCoupon(supabase, product.creator_id, code, lines, subtotalCents);
    if ("rejected" in applied) {
      couponRejected = applied.rejected;
    } else {
      coupon = applied.coupon;
      discountCents = applied.discountCents;
    }
  }

  return {
    ok: true,
    quote: {
      creatorId: product.creator_id,
      currency: product.currency,
      lines,
      subtotalCents,
      discountCents,
      totalCents: subtotalCents - discountCents,
      coupon,
      couponRejected,
    },
  };
}

type ServiceClient = ReturnType<typeof createServiceRoleClient>;
type PrimaryProduct = { id: string; creator_id: string; currency: string };

/**
 * Turns the ids a buyer ticked into priced lines, keeping only products the
 * creator genuinely attached to this one as an order bump. An id that isn't
 * offered, isn't published, or is priced in another currency is dropped
 * rather than refused: the buyer still gets the checkout they came for.
 */
async function resolveBumps(
  supabase: ServiceClient,
  product: PrimaryProduct,
  requestedIds: string[],
): Promise<QuoteLine[]> {
  const wanted = [...new Set(requestedIds)].filter((id) => id && id !== product.id);
  if (wanted.length === 0) return [];

  const { data: offers } = await supabase
    .from("product_offers")
    .select("offer_product_id, discount_percent, position")
    .eq("primary_product_id", product.id)
    .eq("offer_type", "order_bump")
    .in("offer_product_id", wanted)
    .order("position", { ascending: true });

  if (!offers || offers.length === 0) return [];

  const { data: bumpProducts } = await supabase
    .from("products")
    .select("id, name, price_cents, currency, is_published, creator_id")
    .in(
      "id",
      offers.map((o) => o.offer_product_id),
    )
    .eq("creator_id", product.creator_id)
    .eq("is_published", true);

  const byId = new Map((bumpProducts ?? []).map((p) => [p.id, p]));

  const lines: QuoteLine[] = [];
  for (const offer of offers) {
    const bump = byId.get(offer.offer_product_id);
    // Mixing currencies in one Razorpay order isn't possible, so a bump
    // priced differently is simply not offered.
    if (!bump || bump.currency !== product.currency) continue;
    lines.push({
      productId: bump.id,
      name: bump.name,
      unitPriceCents: bumpPriceCents(bump.price_cents, offer.discount_percent),
      listPriceCents: bump.price_cents,
      isOrderBump: true,
    });
  }
  return lines;
}

export function bumpPriceCents(
  listPriceCents: number,
  discountPercent: number | null,
): number {
  if (!discountPercent || discountPercent <= 0) return listPriceCents;
  const capped = Math.min(discountPercent, 100);
  return Math.max(0, Math.round(listPriceCents * (1 - capped / 100)));
}

async function applyCoupon(
  supabase: ServiceClient,
  creatorId: string,
  code: string,
  lines: QuoteLine[],
  subtotalCents: number,
): Promise<{ coupon: { id: string; code: string }; discountCents: number } | { rejected: CouponRejection }> {
  const { data: coupon } = await supabase
    .from("coupons")
    .select("id, code, discount_type, discount_value, product_id, max_redemptions, times_redeemed, expires_at")
    .eq("creator_id", creatorId)
    .eq("code", code)
    .maybeSingle();

  if (!coupon) return { rejected: "unknown" };
  if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
    return { rejected: "expired" };
  }
  if (coupon.max_redemptions !== null && coupon.times_redeemed >= coupon.max_redemptions) {
    return { rejected: "used_up" };
  }

  // A coupon tied to one product discounts only that line, even when it's
  // bought alongside a bump.
  const base = coupon.product_id
    ? lines
        .filter((line) => line.productId === coupon.product_id)
        .reduce((sum, line) => sum + line.unitPriceCents, 0)
    : subtotalCents;

  if (base <= 0) return { rejected: "wrong_product" };

  const value = Number(coupon.discount_value);
  const raw =
    coupon.discount_type === "percent"
      ? Math.round((base * Math.min(value, 100)) / 100)
      : Math.round(value * 100);
  const discountCents = Math.max(0, Math.min(raw, base));

  const total = subtotalCents - discountCents;
  if (total > 0 && total < MIN_CHARGEABLE_CENTS) return { rejected: "below_minimum" };

  return { coupon: { id: coupon.id, code: coupon.code }, discountCents };
}

export const COUPON_MESSAGES: Record<CouponRejection, string> = {
  unknown: "That code isn't valid here.",
  expired: "That code has expired.",
  used_up: "That code has been fully claimed.",
  wrong_product: "That code doesn't apply to this product.",
  below_minimum: "That code brings the total below the minimum we can charge.",
};
