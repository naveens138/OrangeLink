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

const PRODUCT_COLUMNS =
  "id, name, description, price_cents, currency, cover_image_url";

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

  const { data: page } = await supabase
    .from("pages")
    .select("id, creator_id, slug, title, theme, published")
    .eq("creator_id", creator.id)
    .eq("is_primary", true)
    .eq("published", true)
    .maybeSingle();

  if (!page) return null;

  const { data: blocks } = await supabase
    .from("blocks")
    .select(BLOCK_COLUMNS)
    .eq("page_id", page.id)
    .order("position", { ascending: true });

  const { data: products } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("creator_id", creator.id)
    .eq("is_published", true);

  const { data: pixels } = await supabase
    .from("tracking_pixels")
    .select("id, provider, pixel_id, created_at")
    .eq("creator_id", creator.id);

  return {
    creator: creator as Creator,
    page: { ...(page as Omit<Page, "blocks">), blocks: (blocks ?? []) as Block[] },
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
