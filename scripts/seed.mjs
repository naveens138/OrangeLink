// Seeds the demo creator the app used to hardcode in src/lib/mock-data.ts.
// Idempotent: re-running replaces the demo creator's rows, leaving other
// accounts untouched.
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./db.mjs";

const env = loadEnv();
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const DEMO_EMAIL = "jane@example.com";
const DEMO_PASSWORD = "OrangeLinkDemo123!";

function die(step, error) {
  if (!error) return;
  console.error(`FAILED at ${step}: ${error.message}`);
  process.exit(1);
}

// --- auth user ------------------------------------------------------------
const { data: list, error: listErr } = await admin.auth.admin.listUsers();
die("listUsers", listErr);

let user = list.users.find((u) => u.email === DEMO_EMAIL);
if (user) {
  console.log(`reusing auth user ${DEMO_EMAIL}`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  die("createUser", error);
  user = data.user;
  console.log(`created auth user ${DEMO_EMAIL}`);
}

const creatorId = user.id;

// --- clear previous demo rows --------------------------------------------
// creators cascades to pages -> blocks and products, so one delete is enough.
await admin.from("creators").delete().eq("id", creatorId);

// --- creator --------------------------------------------------------------
die(
  "insert creator",
  (
    await admin.from("creators").insert({
      id: creatorId,
      username: "jane",
      display_name: "Jane Rivera",
      bio: "Photographer & presets. New drop every month.",
      onboarding_completed: true,
    })
  ).error,
);

// --- page -----------------------------------------------------------------
const { data: page, error: pageErr } = await admin
  .from("pages")
  .insert({
    creator_id: creatorId,
    slug: "jane",
    is_primary: true,
    title: "Jane Rivera",
    theme: { preset: "warm", tabbed_view: true },
    published: true,
  })
  .select()
  .single();
die("insert page", pageErr);

// --- products -------------------------------------------------------------
const { data: products, error: productErr } = await admin
  .from("products")
  .insert([
    {
      creator_id: creatorId,
      type: "digital_file",
      name: "Editorial Lightroom Presets",
      description: "12 warm-tone presets for portrait and street photography.",
      price_cents: 2400,
      currency: "USD",
    },
    {
      creator_id: creatorId,
      type: "coaching",
      name: "1:1 Portfolio Review",
      description: "30-minute call reviewing your portfolio and next steps.",
      price_cents: 8000,
      currency: "USD",
    },
  ])
  .select();
die("insert products", productErr);

const [presets, review] = products;

// --- blocks ---------------------------------------------------------------
const { error: blockErr } = await admin.from("blocks").insert([
  {
    page_id: page.id,
    type: "link",
    position: 0,
    config: { label: "My YouTube channel", url: "https://youtube.com" },
  },
  {
    page_id: page.id,
    type: "product",
    position: 1,
    config: { product_id: presets.id },
  },
  {
    page_id: page.id,
    type: "product",
    position: 2,
    config: { product_id: review.id },
  },
  {
    page_id: page.id,
    type: "email_capture",
    position: 3,
    config: { headline: "Get notified about new presets", cta_text: "Notify me" },
  },
  {
    page_id: page.id,
    type: "social_icons",
    position: 4,
    config: { platforms: ["instagram", "youtube", "tiktok"] },
  },
]);
die("insert blocks", blockErr);

console.log(`seeded creator ${creatorId}`);
console.log(`  page ${page.id} (/jane, published)`);
console.log(`  ${products.length} products, 5 blocks`);
console.log(`\nsign in with  ${DEMO_EMAIL}  /  ${DEMO_PASSWORD}`);
