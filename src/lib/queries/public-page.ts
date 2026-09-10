import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Block, Creator, Page, Product, TrackingPixel } from "@/lib/types";

// Public storefront reads run through the service role and filter to
// published rows here, rather than opening these tables up to the anon key —
// see BUILD_BRIEF.md §5. password_hash is deliberately absent from the column
// list so it can never reach the browser; PasswordGate verifies through the
// verify_block_password RPC instead.
const BLOCK_COLUMNS =
  "id, type, position, is_visible, visible_from, visible_until, is_password_protected, config";

// `type` drives the small meta label on each storefront card ("Digital" vs
// "Session"); without it every product read as a generic "Product".
const PRODUCT_COLUMNS =
  "id, type, name, description, price_cents, currency, cover_image_url";

export interface PublicPageData {
  creator: Creator;
  page: Page;
  products: Product[];
  pixels: TrackingPixel[];
}

export async function getPublicPage(
  username: string,
): Promise<PublicPageData | null> {
  const supabase = createServiceRoleClient();

  const { data: creator } = await supabase
    .from("creators")
    .select("id, username, display_name, bio, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (!creator) return null;

  // Everything else only needs the creator's id, so it goes in one parallel
  // batch, with blocks embedded in the page row. This used to be five
  // queries in a row, each a round trip to the database.
  const [{ data: page }, { data: products }, { data: pixels }] = await Promise.all([
    supabase
      .from("pages")
      .select(`id, creator_id, slug, title, theme, published, blocks(${BLOCK_COLUMNS})`)
      .eq("creator_id", creator.id)
      .eq("is_primary", true)
      .eq("published", true)
      .order("position", { referencedTable: "blocks", ascending: true })
      .maybeSingle(),
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("creator_id", creator.id)
      .eq("is_published", true),
    supabase
      .from("tracking_pixels")
      .select("id, provider, pixel_id, created_at")
      .eq("creator_id", creator.id),
  ]);

  if (!page) return null;

  const { blocks, ...pageRow } = page as Omit<Page, "blocks"> & { blocks: Block[] | null };

  return {
    creator: creator as Creator,
    page: { ...pageRow, blocks: blocks ?? [] },
    products: (products ?? []) as Product[],
    pixels: (pixels ?? []) as TrackingPixel[],
  };
}

export async function getPublicProduct(
  username: string,
  productId: string,
): Promise<{ creator: Creator; product: Product } | null> {
  const supabase = createServiceRoleClient();

  const { data: creator } = await supabase
    .from("creators")
    .select("id, username, display_name, bio, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (!creator) return null;

  const { data: product } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", productId)
    .eq("creator_id", creator.id)
    .eq("is_published", true)
    .maybeSingle();

  if (!product) return null;

  return { creator: creator as Creator, product: product as Product };
}
