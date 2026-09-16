import "server-only";
import { assertSafeUrl, UnsafeUrlError } from "./safe-url";

export { UnsafeUrlError };

const MAX_BYTES = 2_000_000; // 2 MB — link-in-bio pages are far smaller
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

export interface FetchedPage {
  url: string;
  html: string;
  truncated: boolean;
}

/** Fetches a page with SSRF checks on every redirect hop, a timeout, and a size cap. */
export async function safeFetchPage(raw: string): Promise<FetchedPage> {
  let current = await assertSafeUrl(raw);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual", // each hop is re-validated rather than trusted
        signal: controller.signal,
        headers: {
          // Identifying the bot is the courteous thing to do, and some hosts
          // serve a saner page to a declared crawler than to a blank agent.
          "user-agent":
            "OrangeLinkImporter/1.0 (+https://orangelink.in/import; page import on behalf of its owner)",
          accept: "text/html,application/xhtml+xml",
          "accept-language": "en-US,en;q=0.9",
        },
      });
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof Error && e.name === "AbortError") {
        throw new UnsafeUrlError("That page took too long to respond.");
      }
      throw new UnsafeUrlError("We couldn't reach that page.");
    }
    clearTimeout(timer);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new UnsafeUrlError("That page redirected nowhere.");
      // Re-run the full check — a public URL is allowed to redirect to a
      // private one, which is exactly how SSRF filters get bypassed.
      current = await assertSafeUrl(new URL(location, current).toString());
      continue;
    }

    if (!res.ok) {
      throw new UnsafeUrlError(
        res.status === 404
          ? "That page doesn't exist."
          : `That page returned an error (${res.status}).`,
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html") && !contentType.includes("text")) {
      throw new UnsafeUrlError("That link isn't a web page.");
    }

    const { text, truncated } = await readCapped(res);
    return { url: current.toString(), html: text, truncated };
  }

  throw new UnsafeUrlError("That page redirected too many times.");
}

/** Reads the body but stops at MAX_BYTES so a huge response can't exhaust memory. */
async function readCapped(
  res: Response,
): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) return { text: await res.text(), truncated: false };

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      chunks.push(value.slice(0, value.length - (total - MAX_BYTES)));
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  return { text: new TextDecoder("utf-8").decode(merged), truncated };
}
