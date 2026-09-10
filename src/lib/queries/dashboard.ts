import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Block, Creator, Page, Product } from "@/lib/types";

const BLOCK_COLUMNS =
  "id, type, position, is_visible, visible_from, visible_until, is_password_protected, config";

export interface DashboardContext {
  userId: string;
  creator: Creator;
  page: Page;
  products: Product[];
}

/**
 * Loads the signed-in creator's own data. Reads go through the cookie-bound
 * client so RLS scopes them to this user — no creator_id filter needed, and a
 * bug here can't leak another account's rows.
 *
 * Redirects rather than returning null: /login if there's no session,
 * /claim-username if the account exists but hasn't picked a username yet.
 *
 * Built for speed, because every dashboard navigation waits on it:
 *
 *   - cache() makes it run once per request. The layout and the page both
 *     call it, and without this each call repeated every query.
 *   - getClaims() verifies the session token against Supabase's published
 *     signing keys (cached), instead of getUser()'s round trip to the Auth
 *     server. The database still checks the token on every query, so RLS
 *     is enforced exactly as before.
 *   - Everything is fetched in one parallel batch: blocks come embedded in
 *     the page row rather than in a second query that waited on the first.
 */
export const requireCreator = cache(async (): Promise<DashboardContext> => {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) redirect("/login");

  const [{ data: creator }, { data: page }, { data: products }] = await Promise.all([
    supabase
      .from("creators")
      .select("id, username, display_name, bio, avatar_url")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("pages")
      .select(`id, creator_id, slug, title, theme, published, blocks(${BLOCK_COLUMNS})`)
      .eq("creator_id", userId)
      .eq("is_primary", true)
      .order("position", { referencedTable: "blocks", ascending: true })
      .maybeSingle(),
    supabase
      .from("products")
      .select(
        "id, type, name, description, price_cents, currency, cover_image_url, file_url, is_published, dodo_product_id",
      )
      .eq("creator_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  if (!creator || !page) redirect("/claim-username");

  const { blocks, ...pageRow } = page as Omit<Page, "blocks"> & { blocks: Block[] | null };

  return {
    userId,
    creator: creator as Creator,
    page: { ...pageRow, blocks: blocks ?? [] },
    products: (products ?? []) as Product[],
  };
});
