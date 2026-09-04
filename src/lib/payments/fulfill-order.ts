import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createSignedDownloadUrl } from "@/lib/storage/product-files";
import { recordEvent } from "@/lib/analytics/record-event";

export interface FulfillOrderInput {
  productId: string;
  creatorId: string;
  /** From the analytics visitor id threaded through checkout (Razorpay notes / Dodo metadata) — absent if JS was blocked or this predates Milestone 6. */
  visitorId?: string | null;
  email: string;
  name: string;
  amountCents: number;
  currency: string;
  provider: string;
  providerPaymentId: string;
  providerCheckoutSessionId?: string | null;
}

export type FulfillOrderResult =
  | { ok: true; alreadyProcessed: boolean; downloadUrl: string | null }
  | { ok: false; error: string };

/**
 * Single path from "a payment provider confirms money moved" to "our
 * orders/order_items/customers/deliveries tables reflect that" — shared by
 * every provider (Dodo's webhook, Razorpay's verify-payment route) so
 * fulfillment logic exists exactly once rather than drifting between two
 * copies.
 *
 * Callers are responsible for having already verified the payment is
 * genuine (Dodo: Standard Webhooks signature; Razorpay: HMAC signature) —
 * this function trusts its input completely and only enforces idempotency.
 */
export async function fulfillOrder(
  input: FulfillOrderInput,
): Promise<FulfillOrderResult> {
  const supabase = createServiceRoleClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, type, file_url")
    .eq("id", input.productId)
    .maybeSingle();
  if (!product) {
    return { ok: false, error: `Product ${input.productId} not found.` };
  }

  // platform_fee_bps already existed on `creators` (schema.sql) but nothing
  // ever read it — every order silently took a 0% platform fee regardless
  // of plan. Computed here since it's what the manual payout ledger
  // (migrations/0009, creator_payout_balances) actually pays out against.
  const { data: creatorRow } = await supabase
    .from("creators")
    .select("platform_fee_bps")
    .eq("id", input.creatorId)
    .maybeSingle();
  const platformFeeCents = Math.round(
    (input.amountCents * (creatorRow?.platform_fee_bps ?? 0)) / 10000,
  );

  const { data: customer, error: customerError } = await upsertCustomer(
    supabase,
    input.creatorId,
    input.email,
    input.name,
    input.amountCents,
  );
  if (customerError || !customer) {
    return { ok: false, error: customerError?.message ?? "Customer upsert failed." };
  }

  // Attribution is denormalized onto the order at fulfillment time (per
  // BUILD_BRIEF.md §5) by reading back the UTM this visitor already had
  // recorded from their first page_view — not re-parsed from the checkout
  // request, so it reflects true first-touch attribution.
  const attribution = input.visitorId
    ? await getVisitorAttribution(supabase, input.visitorId)
    : null;

  // Idempotency: the unique index on orders.provider_payment_id
  // (migrations/0003) makes a duplicate insert fail fast (23505) rather than
  // double-fulfilling — necessary because Dodo retries webhooks up to 8
  // times, and a flaky network could cause a client to resubmit a Razorpay
  // verification too.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      creator_id: input.creatorId,
      customer_id: customer.id,
      status: "paid",
      subtotal_cents: input.amountCents,
      discount_cents: 0,
      platform_fee_cents: platformFeeCents,
      total_cents: input.amountCents,
      currency: input.currency,
      payment_provider: input.provider,
      provider_payment_id: input.providerPaymentId,
      provider_checkout_session_id: input.providerCheckoutSessionId ?? null,
      visitor_id: input.visitorId ?? null,
      attribution_utm: attribution,
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (orderError) {
    if (orderError.code === "23505") {
      const existingUrl = await findExistingDownloadUrl(
        supabase,
        input.providerPaymentId,
      );
      return { ok: true, alreadyProcessed: true, downloadUrl: existingUrl };
    }
    return { ok: false, error: orderError.message };
  }

  const { data: orderItem, error: itemError } = await supabase
    .from("order_items")
    .insert({
      order_id: order.id,
      product_id: product.id,
      unit_price_cents: input.amountCents,
      quantity: 1,
    })
    .select("id")
    .single();

  if (itemError || !orderItem) {
    return { ok: false, error: itemError?.message ?? "order_item insert failed." };
  }

  let downloadUrl: string | null = null;
  if (product.type === "digital_file" && product.file_url) {
    const signed = await createSignedDownloadUrl(product.file_url);
    if (signed) {
      await supabase.from("deliveries").insert({
        order_item_id: orderItem.id,
        delivery_method: "download_link",
        signed_url: signed.url,
        signed_url_expires_at: signed.expiresAt,
        delivered_at: new Date().toISOString(),
      });
      downloadUrl = signed.url;
    }
  }

  // Best-effort, same reasoning as email capture's ESP sync: the sale
  // already happened and is already recorded in `orders` — a missing
  // visitor id (JS blocked, or a purchase that predates this milestone)
  // must never turn a successful fulfillment into an error.
  if (input.visitorId) {
    await recordEvent({
      creatorId: input.creatorId,
      visitorId: input.visitorId,
      eventType: "checkout_complete",
      productId: input.productId,
      orderId: order.id,
    });
  }

  return { ok: true, alreadyProcessed: false, downloadUrl };
}

async function getVisitorAttribution(
  supabase: ReturnType<typeof createServiceRoleClient>,
  visitorId: string,
): Promise<Record<string, string> | null> {
  const { data: visitor } = await supabase
    .from("visitors")
    .select("utm_source, utm_medium, utm_campaign, utm_content")
    .eq("id", visitorId)
    .maybeSingle();
  if (!visitor) return null;

  const utm = Object.fromEntries(
    Object.entries(visitor).filter(([, v]) => v != null),
  ) as Record<string, string>;
  return Object.keys(utm).length > 0 ? utm : null;
}

async function findExistingDownloadUrl(
  supabase: ReturnType<typeof createServiceRoleClient>,
  providerPaymentId: string,
): Promise<string | null> {
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("provider_payment_id", providerPaymentId)
    .maybeSingle();
  if (!order) return null;

  const { data: item } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", order.id)
    .limit(1)
    .maybeSingle();
  if (!item) return null;

  const { data: delivery } = await supabase
    .from("deliveries")
    .select("signed_url")
    .eq("order_item_id", item.id)
    .maybeSingle();
  return delivery?.signed_url ?? null;
}

async function upsertCustomer(
  supabase: ReturnType<typeof createServiceRoleClient>,
  creatorId: string,
  email: string,
  name: string,
  totalCents: number,
) {
  const { data: existing } = await supabase
    .from("customers")
    .select("id, lifetime_value_cents")
    .eq("creator_id", creatorId)
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return supabase
      .from("customers")
      .update({ lifetime_value_cents: existing.lifetime_value_cents + totalCents })
      .eq("id", existing.id)
      .select("id")
      .single();
  }

  return supabase
    .from("customers")
    .insert({ creator_id: creatorId, email, name, lifetime_value_cents: totalCents })
    .select("id")
    .single();
}
