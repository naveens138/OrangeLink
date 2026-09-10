import { SOCIAL_DOMAINS, type ParsedBlock } from "./types";

/** Query params that are pure tracking — stripping them keeps imported links clean. */
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ref_src",
  "_ga",
]);

export function cleanUrl(raw: string): string {
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export function socialPlatformFor(raw: string): string | undefined {
  try {
    return SOCIAL_DOMAINS[new URL(raw).hostname.toLowerCase()];
  } catch {
    return undefined;
  }
}

/**
 * Whether a social link is an unlabelled profile ("Instagram", "@jane") rather
 * than something the creator titled themselves.
 *
 * The distinction matters: folding every social-domain link into an icon row
 * throws away labels like "Watch my latest film" and demotes a link the
 * creator chose to feature. Only the generic ones become icons; anything they
 * bothered to name stays a full link block.
 */
export function isGenericSocialLabel(
  label: string | undefined,
  platform: string,
): boolean {
  if (!label?.trim()) return true;
  const trimmed = label.trim();
  if (/^@[\w.]+$/.test(trimmed)) return true; // bare handle

  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return new RegExp(
    `^(follow( me)?( on)? |find me on |my )?${platform}( profile| page)?$`,
  ).test(normalized);
}

/** A label good enough to show, derived from the URL when the source had none. */
export function labelFromUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const path = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop();
    if (path) {
      return path
        .replace(/[-_]+/g, " ")
        .replace(/\.\w{2,4}$/, "")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .slice(0, 80);
    }
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

/**
 * Turns raw scraped links into ParsedBlocks.
 *
 * Two decisions worth naming. Social links are folded into one social_icons
 * block rather than left as a row of near-identical buttons, matching how the
 * builder models them. And nothing is dropped — duplicates, empty labels and
 * bare tracking URLs are annotated with warnings and shown for review,
 * because the brief is explicit that import must never silently discard or
 * auto-publish a creator's content.
 */
export function normalizeLinks(
  candidates: { url: string; label?: string; hidden?: boolean }[],
): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const socials: string[] = [];
  const seenUrls = new Map<string, number>();

  for (const candidate of candidates) {
    const url = cleanUrl(candidate.url);
    const social = socialPlatformFor(url);

    // Only unlabelled profile links collapse into the icon row — a link the
    // creator titled keeps its title and its place in the list.
    if (social && isGenericSocialLabel(candidate.label, social)) {
      if (!socials.includes(social)) socials.push(social);
      continue;
    }

    const warnings: string[] = [];
    const previous = seenUrls.get(url);
    if (previous !== undefined) warnings.push("Duplicate of an earlier link");
    seenUrls.set(url, blocks.length);

    let label = candidate.label?.trim();
    if (!label) {
      label = labelFromUrl(url);
      warnings.push("No title found, generated one from the URL");
    }
    if (candidate.hidden) {
      warnings.push("Hidden on the source page");
    }
    if (/^https?:\/\/[^/]+\/?$/.test(url) && !candidate.label) {
      warnings.push("Points at a bare domain");
    }

    blocks.push({
      type: "link",
      config: { label, url },
      warnings: warnings.length ? warnings : undefined,
    });
  }

  if (socials.length) {
    blocks.push({ type: "social_icons", config: { platforms: socials } });
  }

  return blocks;
}
