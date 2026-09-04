"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { runManualImport, runUrlImport } from "@/lib/import/run-import";
import { detectPlatform } from "@/lib/import/platforms";
import type { ImportOutcome } from "@/lib/import/run-import";
import type { ParsedBlock } from "@/lib/import/types";

export type ImportActionResult =
  | { ok: true; jobId: string; outcome: ImportOutcome }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Scrapes a URL and stores the result as a pending import_jobs row. */
export async function startUrlImport(rawUrl: string): Promise<ImportActionResult> {
  const { supabase, user } = await requireUser();

  const platform = detectPlatform(rawUrl);
  // source_platform is constrained by schema.sql to a fixed list; anything we
  // recognise beyond that list is still recorded honestly as a manual paste
  // source rather than silently mislabelled.
  const SCHEMA_PLATFORMS = new Set(["linktree", "stan", "beacons", "lnkbio", "manual_paste"]);
  const sourcePlatform =
    platform && SCHEMA_PLATFORMS.has(platform.id) ? platform.id : "manual_paste";

  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .insert({
      creator_id: user.id,
      source_platform: sourcePlatform,
      source_url: rawUrl,
      status: "parsing",
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return { ok: false, error: jobError?.message ?? "Couldn't start the import." };
  }

  const result = await runUrlImport(rawUrl);

  if (!result.ok) {
    await supabase
      .from("import_jobs")
      .update({ status: "failed", error_message: result.error })
      .eq("id", job.id);
    return { ok: false, error: result.error };
  }

  await supabase
    .from("import_jobs")
    .update({
      status: "ready_for_review",
      parsed_blocks: result.outcome.blocks as unknown as object,
      raw_scraped_data: {
        platform: result.outcome.platform,
        strategy: result.outcome.strategy,
        profile: result.outcome.profile,
        sourceUrl: result.outcome.sourceUrl,
      },
    })
    .eq("id", job.id);

  revalidatePath("/dashboard/import");
  return { ok: true, jobId: job.id, outcome: result.outcome };
}

/** The manual-paste fallback. */
export async function startManualImport(text: string): Promise<ImportActionResult> {
  const { supabase, user } = await requireUser();

  const outcome = await runManualImport(text);

  const { data: job, error } = await supabase
    .from("import_jobs")
    .insert({
      creator_id: user.id,
      source_platform: "manual_paste",
      status: "ready_for_review",
      parsed_blocks: outcome.blocks as unknown as object,
    })
    .select("id")
    .single();

  if (error || !job) {
    return { ok: false, error: error?.message ?? "Couldn't save that import." };
  }

  revalidatePath("/dashboard/import");
  return { ok: true, jobId: job.id, outcome };
}

export interface CommitResult {
  ok: boolean;
  error?: string;
  inserted?: number;
  /** Ids of the rows this import created, so the creator can undo it. */
  createdBlockIds?: string[];
}

/**
 * Writes reviewed blocks onto the creator's page.
 *
 * Appends after existing blocks rather than replacing them — BUILD_BRIEF.md §5
 * is explicit that an import must never silently overwrite a page. The ids of
 * everything created are returned so the whole import can be undone in one
 * step.
 */
export async function commitImport(
  jobId: string,
  blocks: ParsedBlock[],
): Promise<CommitResult> {
  const { supabase, user } = await requireUser();

  if (blocks.length === 0) return { ok: false, error: "Nothing selected to import." };

  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("creator_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (!page) return { ok: false, error: "You don't have a page yet." };

  // Append after whatever is already there.
  const { data: existing } = await supabase
    .from("blocks")
    .select("position")
    .eq("page_id", page.id)
    .order("position", { ascending: false })
    .limit(1);

  const startAt = existing?.length ? existing[0].position + 1 : 0;

  const rows = blocks.map((block, i) => ({
    page_id: page.id,
    type: block.type,
    position: startAt + i,
    // `category` is an AI annotation for the review screen, not page content.
    config: stripReviewOnlyFields(block.config),
  }));

  const { data: created, error } = await supabase
    .from("blocks")
    .insert(rows)
    .select("id");

  if (error) return { ok: false, error: error.message };

  const createdBlockIds = (created ?? []).map((r) => r.id as string);

  // Merge rather than replace: raw_scraped_data holds the untouched parse
  // output, which is the record of what the source page actually said.
  // Overwriting it would destroy the only copy of that.
  const { data: job } = await supabase
    .from("import_jobs")
    .select("raw_scraped_data")
    .eq("id", jobId)
    .maybeSingle();

  await supabase
    .from("import_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      raw_scraped_data: {
        ...((job?.raw_scraped_data as Record<string, unknown> | null) ?? {}),
        createdBlockIds,
      },
    })
    .eq("id", jobId);

  revalidatePath("/dashboard/links");
  revalidatePath("/dashboard/import");
  return { ok: true, inserted: rows.length, createdBlockIds };
}

/** Removes exactly the blocks an import created. */
export async function undoImport(blockIds: string[]): Promise<CommitResult> {
  const { supabase } = await requireUser();
  if (blockIds.length === 0) return { ok: true, inserted: 0 };

  // RLS scopes this to the caller's own blocks, so a forged id deletes nothing.
  const { error } = await supabase.from("blocks").delete().in("id", blockIds);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/links");
  return { ok: true, inserted: blockIds.length };
}

function stripReviewOnlyFields(config: Record<string, unknown>) {
  const { category, ...rest } = config;
  void category; // AI annotation for the review screen only, not page content
  return rest;
}
