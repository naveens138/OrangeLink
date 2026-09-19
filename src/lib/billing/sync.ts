import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createPlatformRazorpayClient } from "@/lib/razorpay/platform";
import { toSubscriptionStatus, type SubscriptionStatus } from "./entitlement";
import { isBillingInterval, planIdFor, type BillingInterval } from "./plans";

/**
 * Pulls one subscription's real state from Razorpay and writes it down.
 *
 * Both paths that can change a subscription — the browser callback after
 * checkout and the webhook — come through here, and neither passes in what
 * it thinks the state is. The signature on either only proves the message is
 * genuine; what the subscription actually is gets re-fetched from Razorpay,
 * the same discipline the storefront's verify-payment route follows.
 */

export type SyncResult =
  | { ok: true; creatorId: string; status: SubscriptionStatus; razorpayStatus: string }
  | { ok: false; error: string };

export async function syncSubscription(subscriptionId: string): Promise<SyncResult> {
  const razorpay = createPlatformRazorpayClient();
  if (!razorpay) return { ok: false, error: "Platform billing isn't configured." };

  let subscription;
  try {
    subscription = await razorpay.subscriptions.fetch(subscriptionId);
  } catch (error) {
    console.error(`[billing sync] couldn't fetch ${subscriptionId}:`, error);
    return { ok: false, error: "Couldn't read that subscription from Razorpay." };
  }

  const supabase = createServiceRoleClient();
  const notes = (subscription.notes ?? {}) as Record<string, string>;

  // The creator comes from the notes we set when the subscription was
  // created; an existing row is the fallback for anything created outside
  // this app (a subscription started from the Razorpay dashboard, say).
  let creatorId = String(notes.orangelink_creator_id ?? "");
  const { data: existing } = await supabase
    .from("platform_subscriptions")
    .select("creator_id, billing_interval")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (!creatorId) creatorId = existing?.creator_id ?? "";
  if (!creatorId) {
    return { ok: false, error: `Subscription ${subscriptionId} has no OrangeLink creator attached.` };
  }

  const interval = resolveInterval(
    notes.orangelink_interval,
    String(subscription.plan_id ?? ""),
    existing?.billing_interval,
  );

  const razorpayStatus = String(subscription.status ?? "");
  const status = toSubscriptionStatus(razorpayStatus);

  const { error } = await supabase.from("platform_subscriptions").upsert(
    {
      id: subscriptionId,
      creator_id: creatorId,
      plan_id: String(subscription.plan_id ?? ""),
      billing_interval: interval,
      status: razorpayStatus,
      current_end: toDate(subscription.current_end),
      charge_at: toDate(subscription.charge_at),
      start_at: toDate(subscription.start_at),
      short_url: subscription.short_url ?? null,
      cancelled_at: razorpayStatus === "cancelled" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return { ok: false, error: error.message };

  await recomputeCreatorBilling(creatorId);
  return { ok: true, creatorId, status, razorpayStatus };
}

/**
 * Rewrites the cache on `creators` from whatever subscription rows exist.
 *
 * Recomputed from all of them rather than set from the row that just
 * changed: a creator who cancels a monthly plan and starts an annual one has
 * two rows, and the one that changed last isn't necessarily the one that
 * decides their access.
 */
export async function recomputeCreatorBilling(creatorId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: rows } = await supabase
    .from("platform_subscriptions")
    .select("status, billing_interval, current_end")
    .eq("creator_id", creatorId);

  const now = Date.now();
  let best: {
    status: SubscriptionStatus;
    interval: BillingInterval | null;
    until: string | null;
    rank: number;
  } = { status: "none", interval: null, until: null, rank: -1 };

  for (const row of rows ?? []) {
    const status = toSubscriptionStatus(row.status);
    const until = row.current_end as string | null;
    const live = until !== null && new Date(until).getTime() > now;
    // Access first, then how healthy the subscription is, then how far the
    // paid period runs.
    const rank =
      (live ? 100 : 0) + (status === "active" ? 10 : status === "past_due" ? 5 : 0);

    if (
      rank > best.rank ||
      (rank === best.rank && until && best.until && new Date(until) > new Date(best.until))
    ) {
      best = {
        status,
        interval: isBillingInterval(row.billing_interval) ? row.billing_interval : null,
        until,
        rank,
      };
    }
  }

  await supabase
    .from("creators")
    .update({
      subscription_status: best.status,
      subscription_interval: best.interval,
      paid_until: best.until,
    })
    .eq("id", creatorId);
}

function resolveInterval(
  fromNotes: string | undefined,
  planId: string,
  fromExisting: string | undefined,
): BillingInterval {
  if (isBillingInterval(fromNotes)) return fromNotes;
  if (planId && planId === planIdFor("annual")) return "annual";
  if (planId && planId === planIdFor("monthly")) return "monthly";
  if (isBillingInterval(fromExisting)) return fromExisting;
  return "monthly";
}

/** Razorpay hands back unix seconds, or null for anything not yet scheduled. */
function toDate(value: number | null | undefined): string | null {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}
