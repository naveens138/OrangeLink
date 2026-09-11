import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { routeCustomDomain } from "@/lib/custom-domain-routing";

export async function proxy(request: NextRequest) {
  // A creator's own domain serves their page and nothing else, so it skips
  // the auth session work below entirely.
  const custom = await routeCustomDomain(request);
  if (custom) return custom;

  return updateSession(request);
}

export const config = {
  // Everything except static assets and image files — without this, the auth
  // check would also run against CSS/JS/image requests.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
