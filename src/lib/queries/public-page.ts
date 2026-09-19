import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Block, Creator, Page, Product, TrackingPixel, UnlockedBlock } from "@/lib/types";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

// Public storefront reads run through the service role and filter to
// published rows here, rather than opening these tables up to the anon key —
// see BUILD_BRIEF.md §5. password_hash is deliberately absent from the column
// list so it can never reach the browser; unlockBlock verifies through the
// verify_block_password RPC instead.
const BLOCK_COLUMNS =
  "id, type, position, is_visible, visible_from, visible_until, is_password_protected, config";

// `type` drives the small meta label on each storefront card ("Digital" vs
// "Session"); without it every product read as a generic "Product".
const PRODUCT_COLUMNS =
  "id, type, name, description, price_cents, currency, cover_image_url";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isLive(block: Block, now: Date): boolean {
  if (!block.is_visible) return false;
  if (block.visible_from && now < new Date(block.visible_from)) return false;
  if (block.visible_until && now > new Date(block.visible_until)) return false;
  return true;
}

// Social icons are page furniture: the page shows them under the bio and
// never puts them behind a gate, so there is nothing to withhold.
function isLocked(block: Block): boolean {
  if (block.type === "social_icons") return false;
  return block.is_password_protected || Boolean(block.config.unlock_condition);
}

// What a locked block looks like on its way to the browser: enough to draw
// the gate and nothing more. A password gate needs only the id; a follow
// gate also needs its own CTA. The real config comes from unlockBlock.
function lockedStub(block: Block): Block {
  const { unlock_condition } = block.config;
  return {
    ...block,
    visible_from: null,
    visible_until: null,
    config: !block.is_password_protected && unlock_condition ? { unlock_condition } : {},
  };
}

function productIdOf(block: Block): string | null {
  if (block.type !== "product") return null;
  const id = block.config.product_id;
  return typeof id === "string" ? id : null;
}

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

  // The page view is a client component, so every block handed to it is
  // serialised into the HTML whether or not it renders. Hidden and
  // out-of-window blocks are dropped here and locked ones cut down to stubs,
  // so none of their links or text reach a visitor who can't see them.
  const now = new Date();
  const publicBlocks = (blocks ?? [])
    .filter((b) => isLive(b, now))
    .map((b) => (isLocked(b) ? lockedStub(b) : b));

  // Only the products the page shows. A product behind a hidden or locked
  // block would otherwise still be listed here with its name and price.
  const shownProductIds = new Set(publicBlocks.map(productIdOf));

  return {
    creator: creator as Creator,
    page: { ...pageRow, blocks: publicBlocks },
    products: ((products ?? []) as Product[]).filter((p) => shownProductIds.has(p.id)),
    pixels: (pixels ?? []) as TrackingPixel[],
  };
}

export type UnlockBlockResult =
  | ({ ok: true } & UnlockedBlock)
  | { ok: false; reason: "wrong_password" | "not_found" | "too_many_attempts" };

// Guessing a block password costs nothing without this: the action is public
// and a password is whatever the creator typed. A visitor gets ATTEMPTS_PER_
// BLOCK wrong guesses at one block, and ATTEMPTS_PER_VISITOR across all of
// them, per window. The count is per visitor rather than per block, so one
// attacker can't lock a creator's own audience out of a block.
const ATTEMPT_WINDOW_MINUTES = 15;
const ATTEMPTS_PER_BLOCK = 10;
const ATTEMPTS_PER_VISITOR = 60;

async function isRateLimited(
  supabase: ServiceClient,
  blockId: string,
  visitorKey: string,
): Promise<boolean> {
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60_000).toISOString();

  const { data } = await supabase
    .from("block_unlock_attempts")
    .select("block_id")
    .eq("visitor_key", visitorKey)
    .gte("attempted_at", since)
    .limit(ATTEMPTS_PER_VISITOR);

  const attempts = (data ?? []) as { block_id: string }[];
  if (attempts.length >= ATTEMPTS_PER_VISITOR) return true;
  return attempts.filter((a) => a.block_id === blockId).length >= ATTEMPTS_PER_BLOCK;
}

async function recordFailedAttempt(
  supabase: ServiceClient,
  blockId: string,
  visitorKey: string,
): Promise<void> {
  await supabase.from("block_unlock_attempts").insert({
    block_id: blockId,
    visitor_key: visitorKey,
  });

  // Pruned on the way past rather than on a schedule: the rows are only
  // useful for one window, and nothing else sweeps this table.
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60_000).toISOString();
    await supabase.from("block_unlock_attempts").delete().lt("attempted_at", cutoff);
  }
}

/**
 * The real content of a locked block, for its gate to show once it opens.
 * A password-protected block comes back only after verify_block_password
 * accepts the attempt; the hash is compared inside the database and never
 * read here, and wrong guesses are rate limited per visitor. A follow gate is
 * honor system (see FollowUnlockGate), so it opens on request, which still
 * keeps its content out of the page HTML.
 *
 * `visitorKey` identifies who is guessing, for the rate limit only. Callers
 * pass one from visitorKeyFromRequest; null skips the limit and is only for
 * paths with no request behind them.
 */
export async function unlockBlock(
  username: string,
  blockId: string,
  password: string | null,
  visitorKey: string | null,
): Promise<UnlockBlockResult> {
  if (!UUID_RE.test(blockId)) return { ok: false, reason: "not_found" };

  const supabase = createServiceRoleClient();

  const { data: creator } = await supabase
    .from("creators")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!creator) return { ok: false, reason: "not_found" };

  // Scoped to the creator's published primary page, the same rows
  // getPublicPage reads, so this can't fetch a draft's blocks by id.
  const { data: page } = await supabase
    .from("pages")
    .select(`id, blocks!inner(${BLOCK_COLUMNS})`)
    .eq("creator_id", creator.id)
    .eq("is_primary", true)
    .eq("published", true)
    .eq("blocks.id", blockId)
    .maybeSingle();

  const block = (page as { blocks: Block[] } | null)?.blocks[0];
  if (!block || !isLive(block, new Date())) return { ok: false, reason: "not_found" };

  if (block.is_password_protected) {
    // Checked before the password is looked at, so a locked-out visitor
    // learns nothing more by guessing.
    if (visitorKey && (await isRateLimited(supabase, block.id, visitorKey))) {
      return { ok: false, reason: "too_many_attempts" };
    }
    if (!password) return { ok: false, reason: "wrong_password" };

    const { data: matches, error } = await supabase.rpc("verify_block_password", {
      block_id: block.id,
      attempt: password,
    });
    if (error) throw new Error(error.message);
    if (matches !== true) {
      if (visitorKey) await recordFailedAttempt(supabase, block.id, visitorKey);
      return { ok: false, reason: "wrong_password" };
    }
  }

  const productId = productIdOf(block);
  let blockProducts: Product[] = [];
  if (productId) {
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("id", productId)
      .eq("creator_id", creator.id)
      .eq("is_published", true);
    blockProducts = (data ?? []) as Product[];
  }

  return { ok: true, block, products: blockProducts };
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
