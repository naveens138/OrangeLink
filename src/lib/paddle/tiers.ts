export interface Tier {
  name: "Starter" | "Pro" | "Advanced";
  description: string;
  features: string[];
  priceId: { month: string; year: string };
}

// Paddle product/price ids for the sandbox catalog created via
// @paddle/paddle-node-sdk — see the catalog-creation notes in PROGRESS.md.
// Edit amounts/trial/country overrides in the Paddle dashboard (Catalog >
// Prices); this file only needs to change if a price id itself changes.
export const TIERS: Tier[] = [
  {
    name: "Starter",
    description: "For creators just getting started.",
    features: [
      "1 published page",
      "Up to 5 products",
      "Email capture",
      "Community support",
    ],
    priceId: {
      month: "pri_01m1kv5v8hfckhhmyxg8ak37ca",
      year: "pri_01m1kv5vkk3rz2r5q90m91xwq9",
    },
  },
  {
    name: "Pro",
    description: "For creators building a real audience.",
    features: [
      "Unlimited products",
      "ESP sync (Kit, Beehiiv, MailerLite)",
      "Analytics & attribution",
      "Priority support",
    ],
    priceId: {
      month: "pri_01m1kv5w9eer3n2ewmqvj463g0",
      year: "pri_01m1kv5wk1y26ndkh2ssww0dmx",
    },
  },
  {
    name: "Advanced",
    description: "For creators running it like a business.",
    features: [
      "Everything in Pro",
      "Custom domain",
      "Automation rules",
      "Media kit",
    ],
    priceId: {
      month: "pri_01m1kv5x9k78zg87x4n0ye99s1",
      year: "pri_01m1kv5xkmw0c1762tzev5v8z9",
    },
  },
];
