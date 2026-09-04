import { collectLinkCandidates, findEmbeddedJson } from "./embedded-json";
import { extractGeneric, extractProfile } from "./generic";
import { normalizeLinks } from "./normalize";
import type { ExtractionResult, SourcePlatform } from "./types";

/**
 * Platform detection and targeted parsers.
 *
 * A refiner runs *instead of* the generic pass, not alongside it, and each one
 * falls back to generic when the page shape it expects isn't there — these
 * sites redesign without notice, and a parser that returns nothing on a
 * changed layout would be worse than the generic path that still works.
 */

interface Platform {
  id: SourcePlatform;
  label: string;
  /** Matched against the hostname with the leading www. removed. */
  domains: string[];
  parse: (html: string, url: string) => ExtractionResult;
}

/** Pulls links out of the page's hydration JSON, keyed to a platform's field names. */
function fromEmbeddedJson(
  html: string,
  url: string,
  platform: SourcePlatform,
  label: string,
): ExtractionResult | null {
  for (const blob of findEmbeddedJson(html)) {
    const candidates = collectLinkCandidates(blob)
      .filter((c) => {
        try {
          const host = new URL(c.url).hostname.replace(/^www\./, "");
          const sourceHost = new URL(url).hostname.replace(/^www\./, "");
          return host !== sourceHost;
        } catch {
          return false;
        }
      })
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    if (candidates.length >= 2) {
      const hidden = candidates.filter((c) => c.hidden).length;
      return {
        platform,
        strategy: "embedded-json",
        profile: extractProfile(html),
        blocks: normalizeLinks(candidates),
        warnings: hidden
          ? [
              hidden === 1
                ? `1 link hidden on the source ${label} page was included and marked.`
                : `${hidden} links hidden on the source ${label} page were included and marked.`,
            ]
          : [],
      };
    }
  }
  return null;
}

/** Shared shape: try the platform's JSON state, else fall back to generic. */
function jsonFirst(platform: SourcePlatform, label: string) {
  return (html: string, url: string): ExtractionResult => {
    const viaJson = fromEmbeddedJson(html, url, platform, label);
    if (viaJson) return viaJson;

    const generic = extractGeneric(html, url);
    return {
      ...generic,
      platform,
      warnings: [
        ...generic.warnings,
        `We recognised this as a ${label} page but couldn't read its data directly, so we read the visible page instead. Check the results carefully.`,
      ],
    };
  };
}

export const PLATFORMS: Platform[] = [
  { id: "linktree", label: "Linktree", domains: ["linktr.ee"], parse: jsonFirst("linktree", "Linktree") },
  { id: "stan", label: "Stan Store", domains: ["stan.store"], parse: parseStan },
  { id: "beacons", label: "Beacons", domains: ["beacons.ai"], parse: jsonFirst("beacons", "Beacons") },
  { id: "lnkbio", label: "Lnk.Bio", domains: ["lnk.bio"], parse: jsonFirst("lnkbio", "Lnk.Bio") },
  { id: "campsite", label: "Campsite", domains: ["campsite.bio"], parse: jsonFirst("campsite", "Campsite") },
  { id: "milkshake", label: "Milkshake", domains: ["msha.ke"], parse: jsonFirst("milkshake", "Milkshake") },
  { id: "directme", label: "Direct.me", domains: ["direct.me"], parse: jsonFirst("directme", "Direct.me") },
  { id: "shorby", label: "Shorby", domains: ["shor.by"], parse: jsonFirst("shorby", "Shorby") },
  { id: "koji", label: "Koji", domains: ["koji.to", "withkoji.com"], parse: jsonFirst("koji", "Koji") },
];

/**
 * Stan pages are storefronts, so a link's price is worth keeping — it tells
 * the creator which imported rows are products they'll want to rebuild as
 * real products rather than plain links.
 */
function parseStan(html: string, url: string): ExtractionResult {
  const viaJson = fromEmbeddedJson(html, url, "stan", "Stan Store");
  if (viaJson) {
    const priced = viaJson.blocks.map((block) => {
      if (block.type !== "link") return block;
      const label = String((block.config as { label?: string }).label ?? "");
      const price = label.match(/(?:^|\s)([$£€]\s?\d[\d,.]*)/)?.[1];
      return price
        ? {
            ...block,
            warnings: [
              ...(block.warnings ?? []),
              `Looks like a paid product (${price.trim()}) — rebuild it as a product to sell it here.`,
            ],
          }
        : block;
    });
    return { ...viaJson, blocks: priced };
  }

  const generic = extractGeneric(html, url);
  return {
    ...generic,
    platform: "stan",
    warnings: [
      ...generic.warnings,
      "We recognised this as a Stan Store but couldn't read its data directly. Products won't carry prices across — rebuild those manually.",
    ],
  };
}

export function detectPlatform(url: string): Platform | null {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  return (
    PLATFORMS.find((p) =>
      p.domains.some((d) => host === d || host.endsWith(`.${d}`)),
    ) ?? null
  );
}

/** Routes to a platform parser when the domain is known, else the generic pass. */
export function extractFromHtml(html: string, url: string): ExtractionResult {
  const platform = detectPlatform(url);
  return platform ? platform.parse(html, url) : extractGeneric(html, url);
}

export const SUPPORTED_PLATFORM_LABELS = PLATFORMS.map((p) => p.label);
