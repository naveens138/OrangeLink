"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchLinkMetadata, type LinkMetadata } from "@/lib/import/link-metadata";
import type { Block, BlockType } from "@/lib/types";
import { isThemePreset, type ThemePreset } from "@/lib/theme-presets";
import { generatePageTheme } from "@/lib/ai/page-theme";
import type { CustomTheme } from "@/lib/theme-custom";
import { getTemplate } from "@/lib/page-templates";
import type { Page } from "@/lib/types";

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

type ThemePatch = { preset?: ThemePreset; tabbed_view?: boolean; custom?: null; template?: null };

/**
 * Merges a change into the page's saved theme instead of overwriting it, so
 * toggling tabs keeps an AI design, and choosing a preset clears it
 * (custom: null). Custom designs only arrive through designPageWithAi, which
 * validates them server-side, so this action never accepts one.
 */
export async function updatePageTheme(pageId: string, patch: ThemePatch): Promise<ActionResult> {
  if (patch.preset !== undefined && !isThemePreset(patch.preset)) {
    return { ok: false, error: "Unknown theme." };
  }
  return writeTheme(pageId, (current) => {
    const next = { ...current, ...patch };
    if (patch.custom === null) delete next.custom;
    if (patch.template === null) delete next.template;
    return next;
  });
}

/**
 * Applies a gallery template. Only the id is stored, and only a known id is
 * accepted. Clears an AI design, which would otherwise sit on top of it.
 */
export async function applyPageTemplate(pageId: string, templateId: string): Promise<ActionResult> {
  if (!getTemplate(templateId)) return { ok: false, error: "Unknown template." };
  const result = await writeTheme(pageId, (current) => {
    const next = { ...current, template: templateId };
    delete next.custom;
    return next;
  });
  return result;
}

/**
 * Designs the page from the creator's description with AI and saves it.
 * Returns the design so the editor can show it without a reload.
 */
export async function designPageWithAi(
  pageId: string,
  description: string,
): Promise<ActionResult<{ theme: CustomTheme; tabbedView?: boolean }>> {
  const text = description.trim().slice(0, 280);
  if (text.length < 3) return { ok: false, error: "Describe the look you want first." };

  const result = await generatePageTheme(text);
  if (!result.ok) return { ok: false, error: result.error };

  const tabbedView =
    result.layout === "tabs" ? true : result.layout === "scroll" ? false : undefined;
  const saved = await writeTheme(pageId, (current) => ({
    ...current,
    template: undefined,
    custom: result.theme,
    ...(tabbedView === undefined ? {} : { tabbed_view: tabbedView }),
  }));
  if (!saved.ok) return saved;
  return { ok: true, data: { theme: result.theme, tabbedView } };
}

async function writeTheme(
  pageId: string,
  change: (current: Page["theme"]) => Page["theme"],
): Promise<ActionResult> {
  const supabase = await createClient();
  // RLS limits both the read and the write to the creator's own page.
  const { data: page, error: readError } = await supabase
    .from("pages")
    .select("theme")
    .eq("id", pageId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };
  if (!page) return { ok: false, error: "Page not found." };

  const { error } = await supabase
    .from("pages")
    .update({ theme: change((page.theme ?? {}) as Page["theme"]) })
    .eq("id", pageId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/links");
  revalidatePath("/[username]", "page");
  return { ok: true, data: undefined };
}

/**
 * Fetches title/description/image for a link block from the pasted URL —
 * same SSRF-guarded fetch + og-tag/embedded-JSON extraction as Milestone 3's
 * page import (src/lib/import/link-metadata.ts). Doesn't touch the block
 * itself; the inspector applies the result so the creator can still edit
 * any field before it's saved.
 */
export async function fetchLinkPreview(url: string): Promise<ActionResult<LinkMetadata>> {
  const result = await fetchLinkMetadata(url);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.metadata };
}
