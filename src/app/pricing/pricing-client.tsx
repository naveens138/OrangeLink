"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatProductPrice } from "@/lib/format";
import { loadRazorpayCheckoutScript } from "@/lib/razorpay/load-checkout-script";
import {
  annualFreeMonths,
  PLAN_CURRENCY,
  PLAN_FEATURES,
  PLAN_NAME,
  PLANS,
  type BillingInterval,
} from "@/lib/billing/plans";
import type { SubscriptionStatus } from "@/lib/billing/entitlement";
import { cn } from "@/lib/utils";

type Stage =
  | { name: "idle" }
  | { name: "starting" }
  | { name: "confirming" }
  | { name: "done" }
  | { name: "error"; message: string };

/**
 * One tier, so this is a single card rather than a comparison table: the
 * only choice to make is how often to pay, which is the toggle above it.
 */
export function PricingClient({
  signedIn,
  hasCreator,
  email,
  subscriptionStatus,
  currentInterval,
  onFreePeriod,
  grantReason,
  grantEndsAt,
  paidUntil,
}: {
  signedIn: boolean;
  hasCreator: boolean;
  email: string | null;
  subscriptionStatus: SubscriptionStatus;
  currentInterval: BillingInterval | null;
  onFreePeriod: boolean;
  grantReason: "trial" | "creator_program" | null;
  grantEndsAt: string | null;
  paidUntil: string | null;
}) {
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const [stage, setStage] = useState<Stage>({ name: "idle" });

  const plan = PLANS[interval];
  const alreadySubscribed = subscriptionStatus === "active";
  const freeMonths = annualFreeMonths();

  async function subscribe() {
    setStage({ name: "starting" });

    const res = await fetch("/api/billing/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStage({ name: "error", message: data.error ?? "Couldn't start the subscription." });
      return;
    }

    try {
      await loadRazorpayCheckoutScript();
    } catch {
      setStage({ name: "error", message: "Couldn't load checkout. Check your connection." });
      return;
    }
    if (!window.Razorpay) {
      setStage({ name: "error", message: "Payment provider failed to load." });
      return;
    }

    const rzp = new window.Razorpay({
      key: data.key_id,
      name: PLAN_NAME,
      description: `${plan.label} plan`,
      // A subscription takes its amount from the plan in Razorpay, so none
      // is passed here — the price the browser shows can't influence what
      // gets charged.
      subscription_id: data.subscription_id,
      prefill: email ? { email } : undefined,
      theme: { color: "#F45100" },
      handler: async (response) => {
        setStage({ name: "confirming" });
        try {
          const verifyRes = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.ok) {
            setStage({ name: "done" });
            router.refresh();
          } else {
            setStage({
              name: "error",
              message: verifyData.error ?? "We couldn't confirm that. Contact support.",
            });
          }
        } catch {
          setStage({
            name: "error",
            message: "Couldn't confirm your subscription. If you were charged, contact support.",
          });
        }
      },
      modal: {
        // Closing the widget without paying is a normal thing to do.
        ondismiss: () => setStage({ name: "idle" }),
      },
    });

    rzp.open();
  }

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col items-center px-5 py-16 md:px-8 md:py-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-h1">One plan. Everything in it.</h1>
        <p className="max-w-lg text-body-lg text-text-secondary">
          No tiers to compare, no features held back. Cancel whenever you like.
        </p>
      </div>

      {/* Toggle */}
      <div className="mt-9 flex items-center gap-1 rounded-pill border border-border bg-surface-1 p-1">
        {(Object.keys(PLANS) as BillingInterval[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setInterval(option)}
            className={cn(
              "rounded-pill px-5 py-2 text-small font-medium transition-colors",
              interval === option
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {PLANS[option].label}
            {option === "annual" && (
              <span className={cn("ml-1.5", interval === option ? "text-white/80" : "text-accent")}>
                {freeMonths} months free
              </span>
            )}
          </button>
        ))}
      </div>

      {/* The card */}
      <div className="mt-8 w-full max-w-[440px] rounded-lg border border-border bg-surface-1 p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <p className="text-label font-mono uppercase tracking-[0.1em] text-text-muted">
          {PLAN_NAME}
        </p>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-mono text-h1 text-text-primary">
            {formatProductPrice(plan.amountCents, PLAN_CURRENCY)}
          </span>
          <span className="text-body text-text-muted">
            /{interval === "monthly" ? "month" : "year"}
          </span>
        </div>

        <p className="mt-1 text-small text-text-secondary">
          {interval === "annual"
            ? `Works out at ${formatProductPrice(plan.perMonthCents, PLAN_CURRENCY)} a month, with ${freeMonths} months free.`
            : `Or ${formatProductPrice(PLANS.annual.amountCents, PLAN_CURRENCY)} a year and get ${freeMonths} months free.`}
        </p>

        <ul className="mt-6 flex flex-col gap-2.5">
          {PLAN_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-body text-text-secondary">
              <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-accent" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-7">
          <PlanAction
            signedIn={signedIn}
            hasCreator={hasCreator}
            alreadySubscribed={alreadySubscribed}
            currentInterval={currentInterval}
            subscriptionStatus={subscriptionStatus}
            paidUntil={paidUntil}
            onFreePeriod={onFreePeriod}
            grantReason={grantReason}
            grantEndsAt={grantEndsAt}
            stage={stage}
            onSubscribe={subscribe}
          />
        </div>

        {stage.name === "error" && (
          <p className="mt-3 flex items-start gap-1.5 text-small text-danger">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {stage.message}
          </p>
        )}
      </div>

      <p className="mt-6 max-w-md text-center text-small text-text-muted">
        Prices in US dollars. What your own buyers pay you is separate and
        goes straight to your Razorpay account.
      </p>
    </main>
  );
}

function PlanAction({
  signedIn,
  hasCreator,
  alreadySubscribed,
  currentInterval,
  subscriptionStatus,
  paidUntil,
  onFreePeriod,
  grantReason,
  grantEndsAt,
  stage,
  onSubscribe,
}: {
  signedIn: boolean;
  hasCreator: boolean;
  alreadySubscribed: boolean;
  currentInterval: BillingInterval | null;
  subscriptionStatus: SubscriptionStatus;
  paidUntil: string | null;
  onFreePeriod: boolean;
  grantReason: "trial" | "creator_program" | null;
  grantEndsAt: string | null;
  stage: Stage;
  onSubscribe: () => void;
}) {
  if (stage.name === "done") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-body text-success">
        <Check className="h-4 w-4" />
        You&apos;re subscribed.
      </div>
    );
  }

  if (alreadySubscribed) {
    return (
      <div className="flex flex-col gap-2 text-center">
        <p className="text-body text-text-primary">
          You&apos;re on the {currentInterval === "annual" ? "annual" : "monthly"} plan.
        </p>
        {paidUntil && (
          <p className="text-small text-text-muted">
            Renews {new Date(paidUntil).toLocaleDateString()}.
          </p>
        )}
      </div>
    );
  }

  if (!signedIn) {
    return (
      <Link href="/signup?next=/pricing" className="block">
        <Button className="w-full">Get started</Button>
      </Link>
    );
  }

  if (!hasCreator) {
    return (
      <Link href="/signup" className="block">
        <Button className="w-full">Claim your username first</Button>
      </Link>
    );
  }

  const busy = stage.name === "starting" || stage.name === "confirming";

  return (
    <div className="flex flex-col gap-3">
      {/* A free period already covers them, so this is scheduled rather than
          charged now: the subscription starts the day that period ends. */}
      {onFreePeriod && grantEndsAt && (
        <div className="flex items-start gap-2 rounded-md border border-border bg-surface-2 p-3 text-small text-text-secondary">
          <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <span>
            {grantReason === "creator_program"
              ? "Your Creator Program year runs to "
              : "Your free trial runs to "}
            {new Date(grantEndsAt).toLocaleDateString()}. Add billing now and
            it starts then, not today.
          </span>
        </div>
      )}

      {subscriptionStatus === "past_due" && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-small text-warning">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Your last payment didn&apos;t go through. Subscribing again fixes it.</span>
        </div>
      )}

      <Button onClick={onSubscribe} disabled={busy} className="w-full">
        {stage.name === "starting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting…
          </>
        ) : stage.name === "confirming" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirming…
          </>
        ) : onFreePeriod ? (
          "Add billing for later"
        ) : (
          "Subscribe"
        )}
      </Button>
    </div>
  );
}
