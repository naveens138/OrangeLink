import { collectLinkCandidates, findEmbeddedJson } from "./embedded-json";
import { extractAnchors, extractJsonLd, metaContent, pageTitle } from "./html";
import { normalizeLinks } from "./normalize";
import type { ExtractionResult, ParsedProfile } from "./types";

/**
 * Extracts a link-in-bio page without knowing which tool built it.
 *
 * Strategies run best-first and the first one that yields links wins:
 *   1. embedded hydration JSON — survives markup changes, carries ordering
 *      and hidden flags the DOM never shows
 *   2. JSON-LD — structured and stable where present
 *   3. anchors — works anywhere, but needs filtering to separate a creator's
 *      links from site chrome
 */

/** Anchors that belong to the host tool, not the creator. */
const CHROME_PATTERNS = [
  /\/(login|signup|sign-up|sign-in|register|pricing|privacy|terms|cookie|support|help|faq|about|blog|careers|contact|report|dmca)\b/i,
  /^\/?(#|javascript:|mailto:|tel:)/i,
];

const CHROME_LABELS = new Set([
  "login",
  "log in",
  "sign up",
  "signup",
  "sign in",
  "get started",
  "create your own",
  "privacy policy",
  "terms",
  "terms of service",
  "cookie policy",
  "report",
  "report this page",
  "help",
  "support",
  "about",
  "pricing",
  "join now",
  "claim your link",
  "make your own",
]);

function isChrome(href: string, text: string, sourceHost: string): boolean {
  const label = text.trim().toLowerCase();
  if (!label && !href) return true;
  if (CHROME_LABELS.has(label)) return true;
  if (CHROME_PATTERNS.some((p) => p.test(href))) return true;

  // A link back to the tool's own marketing site is chrome; a link to the
  // creator's own page on that tool is not necessarily, but it adds nothing
  // to an import either.
  try {
    const url = new URL(href);
    if (url.hostname.replace(/^www\./, "") === sourceHost.replace(/^www\./, "")) {
      return true;
    }
  } catch {
    return true; // relative or malformed — not a destination worth importing
  }
  return false;
}

export function extractProfile(html: string): ParsedProfile {
  const title = metaContent(html, "og:title") ?? pageTitle(html);
  const description =
    metaContent(html, "og:description") ?? metaContent(html, "description");
  const image = metaContent(html, "og:image");

  return {
    // Strip the tool's own branding suffix, e.g. "Jane | Linktree".
    displayName: title
      ?.replace(/\s*[|–—-]\s*(Linktree|Beacons|Stan|Campsite|Milkshake|Koji|Shorby|Lnk\.Bio|Direct\.me).*$/i, "")
      .trim(),
    bio: description,
    avatarUrl: image,
  };
}

export function extractGeneric(html: string, sourceUrl: string): ExtractionResult {
  const warnings: string[] = [];
  const profile = extractProfile(html);

  let sourceHost = "";
  try {
    sourceHost = new URL(sourceUrl).hostname;
  } catch {
    /* sourceUrl is validated upstream; a parse failure here is not fatal */
  }

  // --- 1. embedded hydration JSON -----------------------------------------
  for (const blob of findEmbeddedJson(html)) {
    const candidates = collectLinkCandidates(blob)
      .filter((c) => !isChrome(c.url, c.label ?? "", sourceHost))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    if (candidates.length >= 2) {
      const hiddenCount = candidates.filter((c) => c.hidden).length;
      if (hiddenCount) {
        warnings.push(
          `${hiddenCount} link${hiddenCount === 1 ? " was" : "s were"} hidden on the source page, included but marked.`,
        );
      }
      return {
        platform: "generic",
        strategy: "embedded-json",
        profile,
        blocks: normalizeLinks(candidates),
        warnings,
      };
    }
  }

  // --- 2. JSON-LD ----------------------------------------------------------
  const jsonLd = extractJsonLd(html);
  const ldLinks: { url: string; label?: string }[] = [];
  for (const entry of jsonLd) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const sameAs = obj.sameAs;
    if (Array.isArray(sameAs)) {
      for (const s of sameAs) {
        if (typeof s === "string") ldLinks.push({ url: s });
      }
    }
    if (typeof obj.url === "string" && typeof obj.name === "string") {
      ldLinks.push({ url: obj.url, label: obj.name });
    }
  }
  const usableLd = ldLinks.filter((l) => !isChrome(l.url, l.label ?? "", sourceHost));
  if (usableLd.length >= 2) {
    return {
      platform: "generic",
      strategy: "json-ld",
      profile,
      blocks: normalizeLinks(usableLd),
      warnings,
    };
  }

  // --- 3. anchors ----------------------------------------------------------
  const anchors = extractAnchors(html)
    .filter((a) => /^https?:\/\//i.test(a.href))
    .filter((a) => !isChrome(a.href, a.text, sourceHost));

  if (anchors.length === 0) {
    return {
      platform: "generic",
      strategy: "none",
      profile,
      blocks: [],
      warnings: [
        "We couldn't find any links on that page. It may load its content after the page opens, which we can't see.",
      ],
    };
  }

  warnings.push(
    "Read from the page's visible links. Double-check the titles and order.",
  );

  return {
    platform: "generic",
    strategy: "dom",
    profile,
    blocks: normalizeLinks(anchors.map((a) => ({ url: a.href, label: a.text }))),
    warnings,
  };
}
