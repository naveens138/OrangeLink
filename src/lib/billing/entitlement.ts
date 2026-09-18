import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { BillingInterval } from "./plans";

/**
 * Who has access to paid features, and on what basis.
 *
 * Two quite different things can grant access and they are kept apart on
 * purpose: a real paid subscription (platform_subscriptions, cached onto
 * creators) and a Creator Program free year (billing_overrides, granted by
 * approve_program_submission in migrations/0018). Anyone reading this can
 * tell at a glance which of the two is carrying a given creator, which
 * matters both for revenue reporting and for knowing who to prompt for
 * billing when their year runs out.
 *
 * Nothing here trusts the browser. Status is only ever written by the
 * verified callback or the webhook.
 */

export type SubscriptionStatus = "none" | "active" | "past_due" | "cancelled";
/** A free period someone was given, as opposed to one they paid for. */
export type GrantReason = "trial" | "creator_program";
export type EntitlementSource = "subscription" | GrantReason | "none";

export interface Entitlement {
  hasAccess: boolean;
  /** What is covering them right now. A paid subscription wins over a free period. */
  source: EntitlementSource;
  /** When the current access lapses, when it's time-boxed. */
  until: Date | null;
  subscriptionStatus: SubscriptionStatus;
  interval: BillingInterval | null;
  /** Which free period they have, if any, whether or not it's still running. */
  grantReason: GrantReason | null;
  grantEndsAt: Date | null;
  /** True while that free period is still running. */
  onFreePeriod: boolean;
  /** Their free period has ended, or is close enough that we should ask. */
  needsBilling: boolean;
}

/**
 * How long before a free period ends we start asking for a card. A trial is
 * short enough that a 30 day warning would mean nagging from day one, so the
 * window is scaled to the thing being warned about.
 */
const PROMPT_WINDOW_DAYS: Record<GrantReason, number> = {
  trial: 7,
  creator_program: 30,
};

export { TRIAL_DAYS } from "./trial-length";

export async function getEntitlement(creatorId: string): Promise<Entitlement> {
  const supabase = createServiceRoleClient();

  const [{ data: creator }, { data: override }] = await Promise.all([
    supabase
      .from("creators")
      .select("subscription_status, subscription_interval, paid_until")
      .eq("id", creatorId)
      .maybeSingle(),
    supabase
      .from("billing_overrides")
      .select("free_until, reason")
      .eq("creator_id", creatorId)
      .maybeSingle(),
  ]);

  const now = new Date();
  const status = (creator?.subscription_status ?? "none") as SubscriptionStatus;
  const paidUntil = creator?.paid_until ? new Date(creator.paid_until) : null;
  const grantReason = (override?.reason as GrantReason | undefined) ?? null;
  const grantEndsAt = override?.free_until ? new Date(override.free_until) : null;

  // A cancelled subscription still runs to the end of the period already
  // paid for — access ends when the money ran out, not when they clicked
  // cancel.
  const paidAccess =
    (status === "active" || status === "cancelled" || status === "past_due") &&
    paidUntil !== null &&
    paidUntil > now;

  const grantAccess = grantEndsAt !== null && grantEndsAt > now;

  const promptFrom =
    grantEndsAt && grantReason
      ? new Date(grantEndsAt.getTime() - PROMPT_WINDOW_DAYS[grantReason] * 24 * 60 * 60 * 1000)
      : null;

  return {
    hasAccess: paidAccess || grantAccess,
    source: paidAccess ? "subscription" : grantAccess ? (grantReason ?? "none") : "none",
    until: paidAccess ? paidUntil : grantAccess ? grantEndsAt : null,
    subscriptionStatus: status,
    interval: (creator?.subscription_interval as BillingInterval | null) ?? null,
    grantReason,
    grantEndsAt,
    onFreePeriod: grantAccess,
    // Someone on a free period with no subscription behind it needs billing
    // once the end is in sight; anyone with no access at all needs it now.
    needsBilling:
      !paidAccess && (!grantAccess || (promptFrom !== null && now >= promptFrom)),
  };
}

/**
 * Razorpay's subscription vocabulary, reduced to the four states a gate
 * cares about.
 *
 * `created` and `authenticated` are deliberately 'none': the mandate exists
 * but no money has moved, and access follows the money. `halted` means
 * retries have failed, which is past_due rather than cancelled because it
 * can still recover.
 */
export function toSubscriptionStatus(razorpayStatus: string): SubscriptionStatus {
  switch (razorpayStatus) {
    case "active":
      return "active";
    case "pending":
    case "halted":
      return "past_due";
    case "cancelled":
    case "completed":
    case "expired":
      return "cancelled";
    default:
      return "none";
  }
}
