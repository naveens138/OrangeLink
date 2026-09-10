import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth cookie on every matched request and gates
// /dashboard behind a session. Called from proxy.ts (Next 16 renamed the
// middleware convention to proxy).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() verifies the token's signature against Supabase's published
  // keys (cached), so the gate is as trustworthy as getUser() without a
  // round trip to the Auth server on every request. It also refreshes an
  // expired session, which is this function's other job. getSession() would
  // trust whatever the cookie claims, so it must not be used for a gate.
  const { data: auth } = await supabase.auth.getClaims();
  const user = auth?.claims.sub ? { id: auth.claims.sub } : null;

  const { pathname } = request.nextUrl;

  // /claim-username belongs here too: its action rejects anonymous callers, so
  // leaving it open was not a data risk, but it let someone fill in the form
  // and lose the input to a login redirect on submit.
  const requiresAuth =
    pathname.startsWith("/dashboard") || pathname === "/claim-username";

  if (!user && requiresAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
