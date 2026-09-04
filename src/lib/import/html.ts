/**
 * Small HTML helpers.
 *
 * Deliberately regex-based rather than a DOM parser: we only need meta tags,
 * script contents, and anchors from pages we do not control, and pulling in a
 * full parser to read four things costs more than it returns. These are
 * read-only extractors — nothing here builds HTML, so there is no injection
 * surface in the parsing direction. What comes *out* is untrusted and must be
 * escaped by React at render time (which it is, by default).
 */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  "#x27": "'",
  "#x2F": "/",
  "#47": "/",
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code: string) => {
      const known = ENTITIES[code];
      if (known) return known;
      if (code.startsWith("#x") || code.startsWith("#X")) {
        const n = parseInt(code.slice(2), 16);
        return Number.isNaN(n) ? match : String.fromCodePoint(n);
      }
      if (code.startsWith("#")) {
        const n = parseInt(code.slice(1), 10);
        return Number.isNaN(n) ? match : String.fromCodePoint(n);
      }
      return match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " "));
}

/** Reads a <meta> value by property/name, e.g. "og:title". */
export function metaContent(html: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]);
  }
  return undefined;
}

export function pageTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?.[1] ? decodeEntities(m[1]) : undefined;
}

export interface RawAnchor {
  href: string;
  text: string;
}

/** Every <a href> with its visible text, in document order. */
export function extractAnchors(html: string): RawAnchor[] {
  const anchors: RawAnchor[] = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = decodeEntities(m[1]);
    const text = stripTags(m[2]);
    anchors.push({ href, text });
  }
  return anchors;
}

/** Contents of every <script> tag whose body looks like JSON or a JSON assignment. */
export function extractScriptPayloads(html: string): string[] {
  const payloads: string[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const body = m[2].trim();
    if (body.length > 32) payloads.push(body);
  }
  return payloads;
}

/** JSON-LD blocks, parsed and flattened (a graph may hold several objects). */
export function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed: unknown = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else if (parsed && typeof parsed === "object") {
        const graph = (parsed as { "@graph"?: unknown })["@graph"];
        if (Array.isArray(graph)) out.push(...graph);
        else out.push(parsed);
      }
    } catch {
      // A malformed block is normal in the wild; skip it and keep going.
    }
  }
  return out;
}
