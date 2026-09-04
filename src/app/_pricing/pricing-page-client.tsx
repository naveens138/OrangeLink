"use client";

import { useEffect, useState } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { paddleClientToken, paddleEnvironment } from "@/lib/env-client";
import { TIERS, type Tier } from "@/lib/paddle/tiers";

type BillingCycle = "month" | "year";

export function PricingPageClient({
  country,
  email,
  creatorId,
}: {
  country?: string;
  email?: string;
  creatorId?: string;
}) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("month");
  // priceId -> Paddle's own formatted total string (e.g. "$10.00") — never
  // reformatted or computed here, per Paddle's own currency/rounding rules.
  const [totals, setTotals] = useState<Record<string, string>>({});
  const [pricesLoading, setPricesLoading] = useState(true);

  useEffect(() => {
    const token = paddleClientToken();
    if (!token) return;
    initializePaddle({ token, environment: paddleEnvironment() }).then((p) => {
      if (p) setPaddle(p);
    });
  }, []);

  useEffect(() => {
    if (!paddle) return;

    // pricesLoading starts true and this effect only re-runs if `country`
    // changes (which it won't for a given page load) or Paddle
    // re-initializes — no need to flip it back on synchronously here.
    const items = TIERS.flatMap((tier) => [
      { priceId: tier.priceId.month, quantity: 1 },
      { priceId: tier.priceId.year, quantity: 1 },
    ]);

    paddle
      .PricePreview({
        items,
        // Omitted entirely when we have no country — Paddle.PricePreview()
        // auto-detects location from the visitor's IP in that case. Never
        // pass a placeholder/unknown value here.
        ...(country ? { address: { countryCode: country } } : {}),
      })
      .then((result) => {
        const next: Record<string, string> = {};
        for (const lineItem of result.data.details.lineItems) {
          next[lineItem.price.id] = lineItem.formattedTotals.total;
        }
        setTotals(next);
      })
      .finally(() => setPricesLoading(false));
  }, [paddle, country]);

  function subscribe(tier: Tier) {
    if (!paddle) return;
    paddle.Checkout.open({
      items: [{ priceId: tier.priceId[cycle], quantity: 1 }],
      settings: {
        displayMode: "overlay",
        variant: "one-page",
        successUrl: `${window.location.origin}/welcome`,
      },
      ...(email ? { customer: { email } } : {}),
      // Read back in the subscription.* webhook (src/lib/paddle/
      // process-webhook.ts) to know which creator this subscription
      // belongs to — omitted entirely for a signed-out visitor rather than
      // sending a made-up id; the webhook just records creator_id as null
      // in that case instead of failing.
      ...(creatorId ? { customData: { orangelink_creator_id: creatorId } } : {}),
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-16 md:px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-h1">Pricing</h1>
        <p className="max-w-md text-body-lg text-text-secondary">
          Pick a plan. Cancel any time.
        </p>
      </div>

      <div className="mt-8 flex items-center gap-1 rounded-pill border border-border bg-surface-1 p-1">
        {(["month", "year"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCycle(c)}
            className={cn(
              "rounded-pill px-4 py-2 text-small font-medium transition-colors",
              cycle === c
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {c === "month" ? "Monthly" : "Yearly"}
          </button>
        ))}
      </div>

      <div className="mt-10 grid w-full max-w-4xl gap-5 md:grid-cols-3">
        {TIERS.map((tier) => {
          const priceId = tier.priceId[cycle];
          const total = totals[priceId];
          return (
            <Card key={tier.name} className="flex flex-col gap-5">
              <div>
                <h2 className="text-h3">{tier.name}</h2>
                <p className="mt-1 text-small text-text-secondary">
                  {tier.description}
                </p>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-h2 text-text-primary">
                  {pricesLoading || !total ? "…" : total}
                </span>
                <span className="text-small text-text-muted">
                  /{cycle === "month" ? "mo" : "yr"}
                </span>
              </div>

              <ul className="flex flex-col gap-2">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-small text-text-secondary"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => subscribe(tier)}
                disabled={!paddle}
                className="mt-auto w-full"
              >
                Subscribe
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
