import { NextResponse, type NextRequest } from "next/server";

/**
 * Serves a creator's page on their own domain.
 *
 * Returns null for the platform's own hosts (the request carries on as
 * normal). For a creator's domain it maps:
 *
 *   /            -> /<username>            (their page)
 *   /p/<id>      -> /<username>/p/<id>     (a product)
 *   /<username>… -> unchanged              (links the page itself renders)
 *   /api/…       -> unchanged              (checkout, analytics)
 *   anything else -> redirect to the same path on the main site
 *
 * The host lookup goes through resolve_custom_domain (migration 0014) and is
 * cached in memory for a minute, since it runs on every request to that
 * domain.
 */

const TTL_MS = 60_000;
const cache = new Map<string, { username: string | null; expires: number }>();

function platformHosts(): string[] {
  const hosts = ["localhost", "127.0.0.1"];
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      hosts.push(new URL(site).hostname);
    } catch {
      // Ignore a malformed site URL; the other checks still apply.
    }
  }
  return hosts;
}

function isPlatformHost(host: string): boolean {
  return host.endsWith(".vercel.app") || platformHosts().some((h) => host === h || host === `www.${h}`);
}

async function resolveUsername(host: string): Promise<string | null> {
  const hit = cache.get(host);
  if (hit && hit.expires > Date.now()) return hit.username;

  let username: string | null = null;
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/resolve_custom_domain`,
      {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ host }),
        cache: "no-store",
      },
    );
    if (response.ok) username = (await response.json()) as string | null;
  } catch {
    // Treat a failed lookup as "not connected"; the short cache retries soon.
  }

  cache.set(host, { username, expires: Date.now() + (username ? TTL_MS : TTL_MS / 2) });
  return username;
}

export async function routeCustomDomain(request: NextRequest): Promise<NextResponse | null> {
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (!host || isPlatformHost(host)) return null;

  const username = await resolveUsername(host);
  if (!username) {
    return new NextResponse("This domain isn't connected to an OrangeLink page.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === `/${username}` ||
    pathname.startsWith(`/${username}/`)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/" || pathname.startsWith("/p/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? `/${username}` : `/${username}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Sign-up, legal pages and the rest live on the main site.
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, site));
  return NextResponse.next();
}
