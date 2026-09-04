import "server-only";
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
 */
export async function requireCreator(): Promise<DashboardContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: creator } = await supabase
    .from("creators")
    .select("id, username, display_name, bio, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!creator) redirect("/claim-username");

  const { data: page } = await supabase
    .from("pages")
    .select("id, creator_id, slug, title, theme, published")
    .eq("creator_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (!page) redirect("/claim-username");

  const [{ data: blocks }, { data: products }] = await Promise.all([
    supabase
      .from("blocks")
      .select(BLOCK_COLUMNS)
      .eq("page_id", page.id)
      .order("position", { ascending: true }),
    supabase
      .from("products")
      .select(
        "id, type, name, description, price_cents, currency, cover_image_url, file_url, is_published, dodo_product_id",
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  return {
    userId: user.id,
    creator: creator as Creator,
    page: {
      ...(page as Omit<Page, "blocks">),
      blocks: (blocks ?? []) as Block[],
    },
    products: (products ?? []) as Product[],
  };
}
