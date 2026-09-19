import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";

/**
 * A stable, opaque id for whoever is making the current request, for rate
 * limiting only.
 *
 * The address itself is never stored: an IPv4 space is small enough to walk
 * through a plain hash, so this is an HMAC keyed with a server secret. The
 * service-role key is reused as that secret rather than adding another
 * environment variable to keep in sync across Vercel and local — it is
 * already server-only, already required, and never leaves the server.
 *
 * Returns null when there's no address to key on, which leaves the caller
 * unlimited rather than lumping every such visitor into one bucket.
 */
export async function visitorKeyFromRequest(): Promise<string | null> {
  const h = await headers();
  // Vercel sets both; the first entry of x-forwarded-for is the client.
  const ip =
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  if (!ip) return null;

  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;

  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}
