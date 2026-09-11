// Rebuilds the demo creator's page in the shape of a real creator profile,
// laid out like linktr.ee/mojobike but for a made-up moto creator. None of
// that creator's name, photos or discount codes are used.
//
//   - the Shop holds the creator's OWN products (a preset pack, LUTs, a
//     coaching call), never the gear they recommend
//   - the gear lives in Links. Real brands get an honest one-liner and their
//     own preview image as the thumbnail; discount codes only appear on the
//     made-up brands, because a code on a real brand would be a fake offer
//   - icon socials, and an email capture that opens from Subscribe
//
// Creator photos are licensed files under public/demo/moto, and the product
// covers are built from them by build-moto-covers.mjs (see CREDITS.md).
//
// Reconciles in place rather than deleting and re-inserting. It cannot do
// otherwise: analytics_events references blocks and order_items references
// products, both ON DELETE RESTRICT, so anything that has ever been clicked
// or sold refuses to be deleted. An earlier delete-then-insert version
// ignored those errors and silently doubled the catalogue on every run.
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./db.mjs";

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function check(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

const { data: creator, error: cErr } = await admin
  .from("creators")
  .select("id, username")
  .eq("username", "jane")
  .single();
check("load creator", cErr);

const { error: profileErr } = await admin
  .from("creators")
  .update({
    display_name: "JANE",
    bio: "Discount codes, links, and presets",
    avatar_url: "/demo/moto/rider.jpg",
  })
  .eq("id", creator.id);
check("update profile", profileErr);

const { data: page, error: pgErr } = await admin
  .from("pages")
  .select("id")
  .eq("creator_id", creator.id)
  .eq("is_primary", true)
  .single();
check("load page", pgErr);

// --- Shop: the creator's own products ---------------------------------------
const PRODUCTS = [
  [
    "JANE LR Preset Pack MK1-MK6",
    "Six Lightroom presets made on the road. Warm tarmac, deep shadows, clean skies.",
    3800,
    "digital_file",
    "/demo/moto/cover-presets.jpg",
  ],
  [
    "Cinematic Riding LUTs",
    "The colour grade from my riding films, for Premiere, Resolve and Final Cut.",
    2900,
    "digital_file",
    "/demo/moto/cover-luts.jpg",
  ],
  [
    "1:1 Moto Filmmaking Call",
    "Thirty minutes on mounts, settings and cutting a ride into a story.",
    5500,
    "coaching",
    "/demo/moto/cover-call.jpg",
  ],
];

const { data: existingProducts, error: epErr } = await admin
  .from("products")
  .select("id, name")
  .eq("creator_id", creator.id);
check("load products", epErr);

const byName = new Map(existingProducts.map((p) => [p.name, p.id]));
const productIds = [];

for (const [name, description, price_cents, type, cover] of PRODUCTS) {
  const row = {
    creator_id: creator.id,
    type,
    name,
    description,
    price_cents,
    currency: "USD",
    cover_image_url: cover,
    is_published: true,
  };
  const existingId = byName.get(name);
  if (existingId) {
    const { error } = await admin.from("products").update(row).eq("id", existingId);
    check(`update product ${name}`, error);
    productIds.push(existingId);
  } else {
    const { data, error } = await admin.from("products").insert(row).select("id").single();
    check(`insert product ${name}`, error);
    productIds.push(data.id);
  }
}

// Leftovers get unpublished rather than deleted: a product with orders
// against it cannot be removed, and shouldn't be.
const keep = new Set(productIds);
const stale = existingProducts.filter((p) => !keep.has(p.id));
if (stale.length) {
  const { error } = await admin
    .from("products")
    .update({ is_published: false })
    .in(
      "id",
      stale.map((p) => p.id),
    );
  check("unpublish stale products", error);
}
console.log(`shop: ${productIds.length} own products, ${stale.length} unpublished`);

// --- Links ---------------------------------------------------------------------
// Thumbnails for real brands are the brand's own og:image or touch icon.
const LINKS = [
  ["NEW JANE LR Preset Pack | Out now", `/jane/p/${productIds[0]}`, "/demo/moto/cover-presets.jpg"],
  ["Northbound Gloves | Use code JANE10 to get 10% off", "https://example.com/northbound-gloves", "/demo/moto/gloves.jpg"],
  ["DJI Osmo Action 5 Pro | The camera on my helmet", "https://www.dji.com/osmo-action-5-pro", "https://www-cdn.djiits.com/cms/uploads/20dd07025c2d44092cd9dbf76ad1ecb6@374*374.png"],
  ["Ironhide Moto | Use code JANE15 to get 15% off", "https://example.com/ironhide-moto", "/demo/moto/jacket.jpg"],
  ["Cardo | The comms I ride with", "https://www.cardosystems.com/", "https://cardosystems.com/cdn/shop/files/cardo-favicon.png?crop=center&height=96&v=1706179855&width=96"],
  ["Chigee | The screen on my handlebars", "https://www.chigee.com/", "https://www.chigee.com/cdn/shop/files/chigee_promot.png?v=1727595069&width=600"],
  ["Kickstand Boot Co. | Use code JANE20 to get 20% off", "https://example.com/kickstand-boots", "/demo/moto/boots.jpg"],
  ["Musicbed | Music I use", "https://www.musicbed.com/", "https://cdn.musicbed.com/image/upload/v1523550146/favicons/apple-icon-180x180.png"],
  ["Artlist | Sound effects I use", "https://artlist.io/", "https://artlist.io/apple-touch-icon.png?v=1"],
  ["SIRUI Anamorphic | For the widescreen shots", "https://www.sirui.com/", "https://store.sirui.com/cdn/shop/files/LOGO_17e88755-aa9e-4460-8748-bea3015482ea.jpg?crop=center&height=180&v=1706839265&width=180"],
  ["BenQ ScreenBar Halo 2 | The light over my desk", "https://www.benq.com/en-us/lighting/monitor-light/screenbar-halo-2.html", "https://image.benq.com/is/image/benqco/together45-5?$ResponsivePreset$"],
];

const desired = [
  ...productIds.map((id) => ({ type: "product", config: { product_id: id } })),
  ...LINKS.map(([label, url, image]) => ({ type: "link", config: { label, url, image } })),
  {
    type: "social_icons",
    config: {
      platforms: ["youtube", "instagram", "tiktok"],
      links: {
        youtube: "https://youtube.com/@orangelink.demo",
        instagram: "https://instagram.com/orangelink.demo",
        tiktok: "https://tiktok.com/@orangelink.demo",
      },
    },
  },
  {
    type: "email_capture",
    config: { headline: "Get new presets first", cta_text: "Subscribe" },
  },
];

const { data: existingBlocks, error: ebErr } = await admin
  .from("blocks")
  .select("id")
  .eq("page_id", page.id)
  .order("position", { ascending: true });
check("load blocks", ebErr);

// Reuse existing rows slot for slot so referenced blocks survive.
for (const [i, spec] of desired.entries()) {
  const reuse = existingBlocks[i];
  const row = { ...spec, position: i, is_visible: true, page_id: page.id };
  if (reuse) {
    const { error } = await admin.from("blocks").update(row).eq("id", reuse.id);
    check(`update block ${i}`, error);
  } else {
    const { error } = await admin.from("blocks").insert(row);
    check(`insert block ${i}`, error);
  }
}

const surplus = existingBlocks.slice(desired.length);
let deleted = 0;
let hidden = 0;
for (const b of surplus) {
  const { error } = await admin.from("blocks").delete().eq("id", b.id);
  if (error) {
    // Referenced by analytics_events, so hide it instead of failing the run.
    const { error: hideErr } = await admin
      .from("blocks")
      .update({ is_visible: false, position: 999 })
      .eq("id", b.id);
    check(`hide surplus block ${b.id}`, hideErr);
    hidden++;
  } else {
    deleted++;
  }
}

console.log(
  `blocks: ${desired.length} live (${productIds.length} shop, ${LINKS.length} links, socials, subscribe), ${deleted} deleted, ${hidden} hidden`,
);
