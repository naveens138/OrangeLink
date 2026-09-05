import "server-only";
import { safeFetchPage, UnsafeUrlError } from "./safe-fetch";
import { extractProfile } from "./generic";

export interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
}

export type FetchLinkMetadataResult =
  | { ok: true; metadata: LinkMetadata }
  | { ok: false; error: string };

/**
 * Reuses the exact same fetch-and-extract pipeline as Milestone 3's page
 * import (SSRF-guarded fetch, og-tag/JSON-LD-aware extraction) rather than a
 * second implementation — a pasted link-block URL and an imported profile
 * URL have identical trust and shape requirements: an untrusted,
 * creator-supplied URL that needs the same private-network checks before
 * anything fetches it.
 */
export async function fetchLinkMetadata(rawUrl: string): Promise<FetchLinkMetadataResult> {
  let page;
  try {
    page = await safeFetchPage(rawUrl);
  } catch (error) {
    if (error instanceof UnsafeUrlError) return { ok: false, error: error.message };
    return { ok: false, error: "We couldn't read that page." };
  }

  const profile = extractProfile(page.html);
  return {
    ok: true,
    metadata: {
      title: profile.displayName,
      description: profile.bio,
      image: profile.avatarUrl,
    },
  };
}
