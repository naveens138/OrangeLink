/**
 * OrangeLink's own plan. One tier, two ways to pay for it.
 *
 * Amounts are in the currency's smallest unit, the same convention as
 * products and orders. They exist here as well as in Razorpay because the
 * pricing page has to render before anyone talks to Razorpay; the plan in
 * Razorpay is what actually charges, and scripts/create-subscription-plans.mjs
 * creates it from these numbers so the two can't disagree by accident.
 */

export type BillingInterval = "monthly" | "annual";

export interface PlanOption {
  interval: BillingInterval;
  amountCents: number;
  /** What this works out to per month, for the annual option's small print. */
  perMonthCents: number;
  label: string;
  /** Razorpay's own period/interval pair for plan creation. */
  period: "monthly" | "yearly";
  count: number;
  /** How many cycles a subscription is created for: roughly ten years of them. */
  totalCount: number;
}

export const PLAN_CURRENCY = "USD";

export const PLAN_NAME = "OrangeLink";

export const PLAN_FEATURES = [
  "Your page, your domain",
  "Unlimited links and products",
  "Sell digital products and bookings",
  "Email capture with ESP sync",
  "Analytics and attribution",
  "Order bumps and discount codes",
];

export const PLANS: Record<BillingInterval, PlanOption> = {
  monthly: {
    interval: "monthly",
    amountCents: 1900,
    perMonthCents: 1900,
    label: "Monthly",
    period: "monthly",
    count: 1,
    totalCount: 120,
  },
  annual: {
    interval: "annual",
    amountCents: 18000,
    perMonthCents: 1500,
    label: "Annual",
    period: "yearly",
    count: 1,
    totalCount: 10,
  },
};

/** The saving that justifies the annual option, worked out rather than asserted. */
export function annualSavingCents(): number {
  return PLANS.monthly.amountCents * 12 - PLANS.annual.amountCents;
}

/**
 * "2 months free" — derived, so it stays true if the prices move, and
 * floored rather than rounded: $180 against $19 a month saves 2.5 months,
 * and claiming 3 would be promising more than the arithmetic supports.
 */
export function annualFreeMonths(): number {
  return Math.floor(annualSavingCents() / PLANS.monthly.amountCents);
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "monthly" || value === "annual";
}

/**
 * The Razorpay plan ids, created once by
 * scripts/create-subscription-plans.mjs and kept in the environment. Absent
 * until that has been run, which is what makes billing "not configured".
 */
export function planIdFor(interval: BillingInterval): string | null {
  const id =
    interval === "monthly"
      ? process.env.RAZORPAY_PLAN_ID_MONTHLY
      : process.env.RAZORPAY_PLAN_ID_ANNUAL;
  return id && id.trim() ? id.trim() : null;
}
