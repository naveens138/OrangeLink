import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** How many free years the first round gives away. */
export const PROGRAM_CAP = 100;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Approved submissions so far, the number behind the public counter and
 * the cap. Counted live rather than kept in a separate tally, so it can
 * never drift from the rows themselves.
 */
export async function getApprovedCount(): Promise<number> {
  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from("creator_program_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");
  if (error) throw new Error(`Couldn't count program spots: ${error.message}`);
  return count ?? 0;
}

/**
 * A reel link from Instagram or TikTok, normalised (https, no tracking
 * query), or null if it isn't one.
 */
export function normalizeReelUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim().startsWith("http") ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  const path = url.pathname.replace(/\/+$/, "");

  const isInstagram = host === "instagram.com" && /^\/(reel|reels|p)\/[\w-]+$/.test(path);
  const isTikTok =
    (host === "tiktok.com" && /^\/@[\w.-]+\/video\/\d+$/.test(path)) ||
    ((host === "vm.tiktok.com" || host === "vt.tiktok.com") && /^\/[\w-]+$/.test(path));

  if (!isInstagram && !isTikTok) return null;
  // One spelling per reel ("instagram.com" and "m.instagram.com" become
  // "www.instagram.com"), so the same reel can't be submitted twice.
  const canonicalHost = host === "instagram.com" || host === "tiktok.com" ? `www.${host}` : host;
  return `https://${canonicalHost}${path}`;
}
