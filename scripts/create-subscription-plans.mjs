// Creates OrangeLink's two Razorpay subscription plans, once.
//
// Plans are immutable in Razorpay: to change a price you create a new plan
// and point the env at it, which is why this prints the ids rather than
// writing them anywhere. Existing subscribers keep charging on the old plan.
//
//   node scripts/create-subscription-plans.mjs          # show what it would create
//   node scripts/create-subscription-plans.mjs --create # actually create them
//
// Needs RAZORPAY_PLATFORM_KEY_ID and RAZORPAY_PLATFORM_KEY_SECRET in
// .env.local — OrangeLink's own account, not a creator's.
import { loadEnv } from "./db.mjs";

const env = loadEnv();
const keyId = env.RAZORPAY_PLATFORM_KEY_ID;
const keySecret = env.RAZORPAY_PLATFORM_KEY_SECRET;

// Kept in step with src/lib/billing/plans.ts by hand: two numbers, one
// place each, and the pricing page shows what this creates.
const PLANS = [
  {
    key: "RAZORPAY_PLAN_ID_MONTHLY",
    period: "monthly",
    interval: 1,
    amount: 1900,
    name: "OrangeLink Monthly",
    description: "OrangeLink, billed monthly",
  },
  {
    key: "RAZORPAY_PLAN_ID_ANNUAL",
    period: "yearly",
    interval: 1,
    amount: 18000,
    name: "OrangeLink Annual",
    description: "OrangeLink, billed yearly (two months free)",
  },
];

const CURRENCY = "USD";
const create = process.argv.includes("--create");

if (!keyId || !keySecret) {
  console.error(
    "Missing RAZORPAY_PLATFORM_KEY_ID / RAZORPAY_PLATFORM_KEY_SECRET in .env.local.\n" +
      "These are OrangeLink's own Razorpay keys, the account creators pay INTO —\n" +
      "not the per-creator credentials in creator_payment_accounts.",
  );
  process.exit(1);
}

const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

async function razorpay(path, init) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.description ?? `${res.status} from Razorpay`);
  }
  return body;
}

if (!create) {
  console.log(`Would create on ${keyId.startsWith("rzp_live") ? "LIVE" : "test"} account:\n`);
  for (const plan of PLANS) {
    console.log(
      `  ${plan.name}: ${(plan.amount / 100).toFixed(2)} ${CURRENCY} / ${plan.period} → ${plan.key}`,
    );
  }
  console.log("\nRe-run with --create to actually create them.");
  process.exit(0);
}

// Existing plans are listed first so a second run doesn't quietly create
// duplicates that both look right in the dashboard.
const existing = await razorpay("/plans?count=100");
const byName = new Map((existing.items ?? []).map((p) => [p.item?.name, p]));

const results = [];
for (const plan of PLANS) {
  const already = byName.get(plan.name);
  if (already) {
    console.log(`exists  ${plan.name} → ${already.id}`);
    results.push([plan.key, already.id]);
    continue;
  }

  const created = await razorpay("/plans", {
    method: "POST",
    body: JSON.stringify({
      period: plan.period,
      interval: plan.interval,
      item: {
        name: plan.name,
        description: plan.description,
        amount: plan.amount,
        currency: CURRENCY,
      },
      notes: { orangelink_plan: plan.key },
    }),
  });
  console.log(`created ${plan.name} → ${created.id}`);
  results.push([plan.key, created.id]);
}

console.log("\nAdd these to .env.local and to Vercel:\n");
for (const [key, id] of results) console.log(`${key}=${id}`);
