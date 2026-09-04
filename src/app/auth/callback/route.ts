import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth landing point. Google redirects to Supabase, Supabase redirects here
 * with a one-time code, and this exchanges it for a session cookie.
 *
 * The URL registered in Google Cloud Console is Supabase's
 * /auth/v1/callback — never this route. This route's URL is what goes in
 * Supabase's own "Redirect URLs" allowlist.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Google sends the user back here with ?error= when they cancel the consent
  // screen, so this is a normal path rather than an exceptional one.
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Sign-in did not complete.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Only same-origin relative paths are honoured, so a crafted ?next= can't
  // bounce a freshly signed-in user to another site.
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  // Behind a proxy (Vercel), request.url is the internal origin; the
  // forwarded host is the one the user actually typed.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const base = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  return NextResponse.redirect(`${base}${target}`);
}
