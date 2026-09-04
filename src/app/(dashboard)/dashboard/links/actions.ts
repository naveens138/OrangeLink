"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Block, BlockType } from "@/lib/types";
import type { ThemePreset } from "@/lib/theme-presets";

// Every write here goes through the cookie-bound client, so the RLS policy on
// `blocks` ("creators manage own blocks", joined through pages.creator_id) is
// what actually enforces ownership. A caller passing someone else's block id
// gets zero rows updated rather than a successful write.

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const BLOCK_COLUMNS =
  "id, type, position, is_visible, visible_from, visible_until, is_password_protected, config";

async function assertOwnsPage(pageId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("id")
    .eq("id", pageId)
    .maybeSingle();
  return Boolean(data);
}

export async function createBlock(
  pageId: string,
  type: BlockType,
  position: number,
  config: Record<string, unknown>,
): Promise<ActionResult<Block>> {
  if (!(await assertOwnsPage(pageId))) {
    return { ok: false, error: "Page not found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blocks")
    .insert({ page_id: pageId, type, position, config })
    .select(BLOCK_COLUMNS)
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/links");
  return { ok: true, data: data as Block };
}

export async function updateBlock(
  blockId: string,
  updates: {
    config?: Record<string, unknown>;
    is_visible?: boolean;
    visible_from?: string | null;
    visible_until?: string | null;
    is_password_protected?: boolean;
    /** Plaintext; hashed here and never stored or returned as-is. */
    password?: string | null;
  },
): Promise<ActionResult> {
  const supabase = await createClient();
  const { password, ...rest } = updates;

  // set_block_password owns is_password_protected — writing it here too would
  // let the flag drift out of sync with whether a hash actually exists.
  if (password !== undefined) delete rest.is_password_protected;

  if (Object.keys(rest).length > 0) {
    const { error } = await supabase
      .from("blocks")
      .update(rest)
      .eq("id", blockId);
    if (error) return { ok: false, error: error.message };
  }

  if (password !== undefined) {
    // crypt()/gen_salt() live in Postgres, so the plaintext is hashed inside
    // the database and the hash never round-trips through the browser.
    const { error: pwError } = await supabase.rpc("set_block_password", {
      block_id: blockId,
      new_password: password,
    });
    if (pwError) return { ok: false, error: pwError.message };
  }

  revalidatePath("/dashboard/links");
  return { ok: true, data: undefined };
}

export async function deleteBlock(blockId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("blocks").delete().eq("id", blockId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/links");
  return { ok: true, data: undefined };
}

export async function reorderBlocks(
  pageId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  if (!(await assertOwnsPage(pageId))) {
    return { ok: false, error: "Page not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_blocks", {
    target_page_id: pageId,
    ordered_ids: orderedIds,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/links");
  return { ok: true, data: undefined };
}

export async function updatePageTheme(
  pageId: string,
  preset: ThemePreset,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pages")
    .update({ theme: { preset } })
    .eq("id", pageId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/links");
  return { ok: true, data: undefined };
}
