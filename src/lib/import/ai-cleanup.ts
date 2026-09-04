import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ParsedBlock } from "./types";

/**
 * Tidies scraped link labels and flags junk before the creator reviews them.
 *
 * Scraped labels are frequently unusable — truncated ("Shop my pre..."),
 * shouty ("CLICK HERE!!! 👇👇"), or missing entirely. A single pass over the
 * whole list is used rather than one call per link: it costs far less, and it
 * lets the model see duplicates and inconsistent casing across the set, which
 * per-link calls cannot.
 *
 * This step is strictly optional. If no API key is configured, or the call
 * fails, import proceeds with the scraped labels — a cleanup pass is not worth
 * failing an import over.
 */

const CleanedLink = z.object({
  index: z.number().int().describe("The index of the link being described"),
  label: z
    .string()
    .describe(
      "A clean, human title for the link. Keep the creator's wording and voice; fix casing, truncation and stray punctuation only. Never invent a title that claims something the URL does not support.",
    ),
  category: z
    .enum([
      "social",
      "shop",
      "video",
      "music",
      "newsletter",
      "booking",
      "portfolio",
      "article",
      "download",
      "other",
    ])
    .describe("Best-guess category for this link"),
  issues: z
    .array(
      z.enum([
        "empty_or_generic_label",
        "duplicate",
        "tracking_only",
        "broken_or_placeholder",
      ]),
    )
    .describe("Problems a creator should look at. Empty array if the link looks fine."),
});

const CleanupResult = z.object({
  links: z.array(CleanedLink),
});

const SYSTEM_PROMPT = `You are helping a creator migrate their link-in-bio page to a new platform.

You receive links scraped from their old page. For each one, return a cleaned-up title, a category, and any issues worth their attention.

Rules:
- Preserve the creator's voice and intent. Fix casing, truncation, encoding artefacts and stray emoji spam; do not rewrite a title into marketing copy.
- Never invent a claim the URL does not support. If a title is missing, derive something plain and factual from the URL.
- Flag issues rather than deciding for the creator. They review everything before anything is published.
- "tracking_only" means the URL carries no real destination beyond tracking parameters or a bare redirector.
- "broken_or_placeholder" means the URL is obviously unfinished, e.g. "https://" alone, "example.com", or "#".

Return one entry per input link, with matching indexes.`;

/**
 * Haiku 4.5 — chosen deliberately over a frontier model. This task is short
 * label tidying over a bounded list, where the cheapest capable model is the
 * right call; Haiku is roughly a fifth the input cost of the Opus tier.
 *
 * Note it predates adaptive thinking: `thinking: {type: "adaptive"}` and
 * `output_config.effort` are 4.6+ features and error on this model, so neither
 * is set. Override with IMPORT_CLEANUP_MODEL to try a different one.
 */
const CLEANUP_MODEL = process.env.IMPORT_CLEANUP_MODEL ?? "claude-haiku-4-5";

export interface CleanupOutcome {
  blocks: ParsedBlock[];
  warnings: string[];
  applied: boolean;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Turns an SDK error into something a creator can act on.
 *
 * The billing case is called out specifically: an exhausted credit balance
 * comes back as a 400, not a 401, so it would otherwise be reported as a
 * generic failure and look like a bug in the importer rather than an account
 * that needs topping up.
 */
function describeAiFailure(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "the Anthropic API key was rejected";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "the cleanup service is rate limited right now";
  }
  if (
    error instanceof Anthropic.BadRequestError &&
    /credit balance is too low/i.test(error.message)
  ) {
    return "the Anthropic account is out of credits";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "the cleanup service could not be reached";
  }
  return "the cleanup step failed";
}

const ISSUE_TEXT: Record<string, string> = {
  empty_or_generic_label: "Title looks generic — worth renaming",
  duplicate: "Looks like a duplicate of another link",
  tracking_only: "URL is only tracking parameters — may not go anywhere useful",
  broken_or_placeholder: "URL looks unfinished or broken",
};

export async function cleanUpBlocks(blocks: ParsedBlock[]): Promise<CleanupOutcome> {
  const linkIndexes = blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.type === "link");

  if (!isAiConfigured()) {
    return {
      blocks,
      applied: false,
      warnings: [
        "Automatic title cleanup is off (no ANTHROPIC_API_KEY set), so titles are exactly as they appeared on the source page.",
      ],
    };
  }

  if (linkIndexes.length === 0) return { blocks, applied: false, warnings: [] };

  const payload = linkIndexes.map(({ b }, n) => ({
    index: n,
    label: (b.config as { label?: string }).label ?? "",
    url: (b.config as { url?: string }).url ?? "",
  }));

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: CLEANUP_MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Clean up these ${payload.length} links:\n\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
      output_config: { format: zodOutputFormat(CleanupResult) },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return {
        blocks,
        applied: false,
        warnings: ["Automatic title cleanup didn't return usable results, so the original titles were kept."],
      };
    }

    const next = [...blocks];
    for (const cleaned of parsed.links) {
      const target = linkIndexes[cleaned.index];
      if (!target) continue; // model returned an index we didn't send

      const original = next[target.i];
      const originalLabel = (original.config as { label?: string }).label ?? "";
      const changed =
        cleaned.label.trim() !== "" && cleaned.label.trim() !== originalLabel;

      next[target.i] = {
        ...original,
        config: {
          ...original.config,
          ...(changed ? { label: cleaned.label.trim() } : {}),
          category: cleaned.category,
        },
        originalLabel: changed ? originalLabel : undefined,
        warnings: [
          ...(original.warnings ?? []),
          ...cleaned.issues.map((issue) => ISSUE_TEXT[issue] ?? issue),
        ].filter((v, i, arr) => arr.indexOf(v) === i),
      };
    }

    return { blocks: next, applied: true, warnings: [] };
  } catch (error) {
    // An import that works with rough titles beats an import that fails.
    return {
      blocks,
      applied: false,
      warnings: [`Titles were kept exactly as scraped because ${describeAiFailure(error)}.`],
    };
  }
}

/**
 * Structures a pasted block of text into links.
 *
 * The fallback when scraping finds nothing — the creator pastes whatever they
 * have (a list, an exported file, lines copied off their old page) and the
 * model turns it into links. Without a key this degrades to a line-by-line
 * URL scan, which handles the common "one URL per line" paste.
 */
export async function structurePastedText(
  text: string,
): Promise<{ blocks: ParsedBlock[]; warnings: string[] }> {
  const trimmed = text.trim();
  if (!trimmed) return { blocks: [], warnings: ["Nothing was pasted."] };

  if (!isAiConfigured()) {
    const blocks = parsePastedTextLocally(trimmed);
    return {
      blocks,
      warnings: blocks.length
        ? ["Read the URLs out of your text directly. Check the titles before importing."]
        : ["We couldn't find any links in that text."],
    };
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: CLEANUP_MODEL,
      max_tokens: 8000,
      system: `You turn a creator's pasted notes into a list of links for their link-in-bio page.

Extract every destination you can find, in the order given. Use the creator's own wording for titles where present, otherwise derive a plain factual title from the URL. Do not invent links that are not in the text.`,
      messages: [
        {
          role: "user",
          content: `Extract the links from this text:\n\n${trimmed.slice(0, 20000)}`,
        },
      ],
      output_config: {
        format: zodOutputFormat(
          z.object({
            links: z.array(
              z.object({
                label: z.string().describe("Title for the link"),
                url: z.string().describe("Absolute http(s) URL"),
              }),
            ),
          }),
        ),
      },
    });

    const parsed = response.parsed_output;
    if (!parsed?.links.length) {
      const blocks = parsePastedTextLocally(trimmed);
      return {
        blocks,
        warnings: blocks.length ? [] : ["We couldn't find any links in that text."],
      };
    }

    return {
      blocks: parsed.links
        .filter((l) => /^https?:\/\//i.test(l.url))
        .map((l) => ({ type: "link" as const, config: { label: l.label, url: l.url } })),
      warnings: [],
    };
  } catch (error) {
    const blocks = parsePastedTextLocally(trimmed);
    return {
      blocks,
      warnings: [
        blocks.length
          ? `We read the URLs directly because ${describeAiFailure(error)}. Check the titles.`
          : "We couldn't find any links in that text.",
      ],
    };
  }
}

/** Line-by-line URL scan — the no-key fallback for pasted text. */
export function parsePastedTextLocally(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const urlRe = /https?:\/\/[^\s<>"')]+/gi;

  for (const line of text.split(/\r?\n/)) {
    const matches = line.match(urlRe);
    if (!matches) continue;
    for (const url of matches) {
      // Text on the same line, minus the URL, is very often the title.
      const label = line.replace(url, "").replace(/[-–—|:•*]+/g, " ").trim();
      blocks.push({
        type: "link",
        config: { label: label.slice(0, 120) || "", url },
      });
    }
  }
  return blocks;
}
