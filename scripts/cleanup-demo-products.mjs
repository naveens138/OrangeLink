// Removes the demo creator's (jane) leftover products: the unpublished
// copies an early version of seed-storefront-demo.mjs created when it
// silently doubled the catalogue on every run.
//
// Safe by default: without --apply it only lists what it would remove.
//
//   node scripts/cleanup-demo-products.mjs           # preview
//   node scripts/cleanup-demo-products.mjs --apply   # delete
//
// Only ever touches jane's products that are unpublished AND have never been
// ordered. Anything with an order_items row is kept: sales history must
// survive, and the database refuses that delete anyway (ON DELETE RESTRICT).
// A product's uploaded file, if it has one, is removed from storage too so
// it isn't left orphaned.
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./db.mjs";

const APPLY = process.argv.includes("--apply");
const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function check(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

const { data: creator, error: cErr } = await admin
  .from("creators")
  .select("id")
  .eq("username", "jane")
  .single();
check("load creator", cErr);

const { data: unpublished, error: pErr } = await admin
  .from("products")
  .select("id, name, file_url, created_at")
  .eq("creator_id", creator.id)
  .eq("is_published", false)
  .order("created_at", { ascending: true });
check("load products", pErr);

const ids = unpublished.map((p) => p.id);
const { data: ordered, error: oErr } = ids.length
  ? await admin.from("order_items").select("product_id").in("product_id", ids)
  : { data: [], error: null };
check("load order items", oErr);
const soldIds = new Set(ordered.map((o) => o.product_id));

const removable = unpublished.filter((p) => !soldIds.has(p.id));
const kept = unpublished.filter((p) => soldIds.has(p.id));

console.log(`jane: ${unpublished.length} unpublished products`);
console.log(`  ${removable.length} never ordered, removable:`);
for (const p of removable) console.log(`    - ${p.name}${p.file_url ? "  (+ file)" : ""}`);
if (kept.length) {
  console.log(`  ${kept.length} kept because they have orders:`);
  for (const p of kept) console.log(`    - ${p.name}`);
}

if (!APPLY) {
  console.log("\nPreview only. Run again with --apply to delete the removable ones.");
  process.exit(0);
}

const files = removable.map((p) => p.file_url).filter(Boolean);
if (files.length) {
  const { error } = await admin.storage.from("product-files").remove(files);
  check("remove files", error);
}
if (removable.length) {
  const { error } = await admin
    .from("products")
    .delete()
    .in(
      "id",
      removable.map((p) => p.id),
    );
  check("delete products", error);
}
console.log(`\nDeleted ${removable.length} products and ${files.length} files.`);
