import "server-only";
import { cleanUpBlocks, structurePastedText } from "./ai-cleanup";
import { extractFromHtml } from "./platforms";
import { safeFetchPage, UnsafeUrlError } from "./safe-fetch";
import { normalizeLinks } from "./normalize";
import type { ExtractionResult } from "./types";

export interface ImportOutcome extends ExtractionResult {
  sourceUrl: string;
  aiApplied: boolean;
  /** True when nothing usable was found and the creator should paste manually. */
  needsManualPaste: boolean;
}

/** Fetch → platform-or-generic parse → AI cleanup. Never throws for expected failures. */
export async function runUrlImport(
  rawUrl: string,
): Promise<{ ok: true; outcome: ImportOutcome } | { ok: false; error: string }> {
  let page;
  try {
    page = await safeFetchPage(rawUrl);
  } catch (error) {
    if (error instanceof UnsafeUrlError) return { ok: false, error: error.message };
    return { ok: false, error: "We couldn't read that page." };
  }

  const extracted = extractFromHtml(page.html, page.url);
  const warnings = [...extracted.warnings];
  if (page.truncated) {
    warnings.push("That page was very large, so we only read the first part of it.");
  }

  const cleanup = await cleanUpBlocks(extracted.blocks);
  warnings.push(...cleanup.warnings);

  return {
    ok: true,
    outcome: {
      ...extracted,
      blocks: cleanup.blocks,
      warnings,
      sourceUrl: page.url,
      aiApplied: cleanup.applied,
      needsManualPaste: cleanup.blocks.length === 0,
    },
  };
}

/** The fallback path: creator pastes raw text, we structure it. */
export async function runManualImport(text: string): Promise<ImportOutcome> {
  const { blocks, warnings } = await structurePastedText(text);
  // Route through the same normalizer so pasted links get the same treatment
  // (tracking stripped, socials folded, duplicates flagged) as scraped ones.
  const normalized = normalizeLinks(
    blocks.map((b) => ({
      url: String((b.config as { url?: string }).url ?? ""),
      label: (b.config as { label?: string }).label,
    })),
  );
  const cleanup = await cleanUpBlocks(normalized);

  return {
    platform: "manual_paste",
    strategy: "manual",
    profile: {},
    blocks: cleanup.blocks,
    warnings: [...warnings, ...cleanup.warnings],
    sourceUrl: "",
    aiApplied: cleanup.applied,
    needsManualPaste: cleanup.blocks.length === 0,
  };
}
