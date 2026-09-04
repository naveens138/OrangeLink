import { extractScriptPayloads } from "./html";

/**
 * Finds the hydration state most link-in-bio tools embed in their HTML.
 *
 * Linktree, Beacons, Milkshake, Koji and friends are client-rendered: the
 * server ships a JSON blob and the browser builds the page from it. Reading
 * that blob beats scraping rendered markup — it survives CSS churn, and it
 * carries fields the DOM never shows (link ordering, hidden/scheduled items,
 * the real destination behind a tracking redirect).
 *
 * Handles the common carriers:
 *   <script id="__NEXT_DATA__" type="application/json">{...}</script>
 *   self.__next_f.push([1, "...streamed RSC payload..."])
 *   window.__NUXT__ = {...}
 *   window.__INITIAL_STATE__ = {...}
 * and, failing those, any script body that parses as a JSON object.
 */

const ASSIGNMENT_PATTERNS = [
  /window\.__NEXT_DATA__\s*=\s*/,
  /window\.__NUXT__\s*=\s*/,
  /window\.__INITIAL_STATE__\s*=\s*/,
  /window\.__APOLLO_STATE__\s*=\s*/,
  /window\.__remixContext\s*=\s*/,
  /window\.__data\s*=\s*/,
  /__INITIAL_DATA__\s*=\s*/,
];

/**
 * Extracts a complete JSON value starting at `start` by tracking brace depth.
 * A plain regex cannot do this — link titles routinely contain braces and
 * escaped quotes, and a greedy match would swallow the rest of the script.
 */
function sliceBalanced(source: string, start: number): string | null {
  const open = source[start];
  const close = open === "{" ? "}" : open === "[" ? "]" : null;
  if (!close) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < source.length; i++) {
    const ch = source[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

function tryParse(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Every JSON object embedded in the page, largest first (the state blob is usually biggest). */
export function findEmbeddedJson(html: string): unknown[] {
  const found: { value: unknown; size: number }[] = [];

  // 1. <script type="application/json"> — the cleanest carrier.
  const typedRe =
    /<script\b[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = typedRe.exec(html)) !== null) {
    const parsed = tryParse(m[1].trim());
    if (parsed) found.push({ value: parsed, size: m[1].length });
  }

  for (const body of extractScriptPayloads(html)) {
    // 2. window.__X__ = {...}
    for (const pattern of ASSIGNMENT_PATTERNS) {
      const hit = body.match(pattern);
      if (hit?.index === undefined) continue;
      const start = body.indexOf(hit[0]) + hit[0].length;
      const braceAt = body.slice(start).search(/[{[]/);
      if (braceAt === -1) continue;
      const slice = sliceBalanced(body, start + braceAt);
      if (!slice) continue;
      const parsed = tryParse(slice);
      if (parsed) found.push({ value: parsed, size: slice.length });
    }

    // 3. Next.js App Router streams RSC payloads as pushed string chunks.
    // Concatenating them and pulling out any embedded JSON objects recovers
    // the data even though the whole payload is not valid JSON on its own.
    if (body.includes("__next_f.push")) {
      const chunkRe = /self\.__next_f\.push\(\[\d+\s*,\s*"([\s\S]*?)"\]\)/g;
      let c: RegExpExecArray | null;
      let joined = "";
      while ((c = chunkRe.exec(body)) !== null) {
        const unescaped = tryParse(`"${c[1]}"`);
        if (typeof unescaped === "string") joined += unescaped;
      }
      for (let i = 0; i < joined.length; i++) {
        if (joined[i] !== "{") continue;
        const slice = sliceBalanced(joined, i);
        if (!slice || slice.length < 200) continue;
        const parsed = tryParse(slice);
        if (parsed) {
          found.push({ value: parsed, size: slice.length });
          i += slice.length - 1;
        }
      }
    }

    // 4. Last resort: the whole script body is JSON.
    if (body.startsWith("{") || body.startsWith("[")) {
      const parsed = tryParse(body);
      if (parsed) found.push({ value: parsed, size: body.length });
    }
  }

  return found.sort((a, b) => b.size - a.size).map((f) => f.value);
}

/**
 * Walks a parsed blob and collects every object that looks like a link,
 * without knowing the platform's schema.
 *
 * Shapes differ across tools (`url`/`href`/`link`/`destination`, paired with
 * `title`/`label`/`text`/`name`), and nesting is arbitrary, so this recurses
 * and matches on field names rather than a fixed path.
 */
export interface JsonLinkCandidate {
  url: string;
  label?: string;
  hidden?: boolean;
  position?: number;
}

const URL_KEYS = ["url", "href", "link", "destination", "targetUrl", "target_url", "originalUrl"];
const LABEL_KEYS = ["title", "label", "text", "name", "displayName", "caption", "heading"];
const HIDDEN_KEYS = ["hidden", "isHidden", "archived", "isArchived", "deleted"];

export function collectLinkCandidates(root: unknown): JsonLinkCandidate[] {
  const out: JsonLinkCandidate[] = [];
  const seen = new Set<unknown>();

  function visit(node: unknown, depth: number) {
    if (depth > 12 || node === null || typeof node !== "object") return;
    if (seen.has(node)) return; // guards against cyclic structures
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }

    const obj = node as Record<string, unknown>;

    let url: string | undefined;
    for (const key of URL_KEYS) {
      const v = obj[key];
      if (typeof v === "string" && /^https?:\/\//i.test(v)) {
        url = v;
        break;
      }
    }

    if (url) {
      let label: string | undefined;
      for (const key of LABEL_KEYS) {
        const v = obj[key];
        if (typeof v === "string" && v.trim() && v.length < 300) {
          label = v.trim();
          break;
        }
      }
      const hidden = HIDDEN_KEYS.some((k) => obj[k] === true);
      const positionRaw = obj.position ?? obj.order ?? obj.sortOrder;
      out.push({
        url,
        label,
        hidden,
        position: typeof positionRaw === "number" ? positionRaw : undefined,
      });
    }

    for (const value of Object.values(obj)) visit(value, depth + 1);
  }

  visit(root, 0);
  return out;
}
