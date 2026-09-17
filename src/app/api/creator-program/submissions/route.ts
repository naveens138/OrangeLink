import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getApprovedCount, normalizeReelUrl, PROGRAM_CAP, EMAIL_RE } from "@/lib/creator-program";

/**
 * Takes a reel submission for the Creator Program.
 *
 * The 100-spot cap is enforced here, not just by the page swapping the form
 * for the waitlist: once PROGRAM_CAP submissions are approved, this refuses
 * new ones outright. (Approval re-checks the cap under a lock in
 * approve_program_submission, so the count can't be overshot there either.)
 */
export async function POST(request: NextRequest) {
  let body: { identity?: unknown; reelUrl?: unknown; note?: unknown; website?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: a field people never see. Bots fill it; pretend it worked.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true, hasAccount: true });
  }

  if ((await getApprovedCount()) >= PROGRAM_CAP) {
    return NextResponse.json(
      { error: "All 100 spots are claimed. Join the waitlist for the next round.", full: true },
      { status: 409 },
    );
  }

  const identity = String(body.identity ?? "").trim();
  const reelUrl = normalizeReelUrl(String(body.reelUrl ?? ""));
  const note = String(body.note ?? "").trim().slice(0, 1000) || null;

  if (!identity || identity.length > 254) {
    return NextResponse.json({ error: "Enter your OrangeLink username or email." }, { status: 400 });
  }
  const looksLikeEmail = identity.includes("@") && !identity.startsWith("@");
  if (looksLikeEmail && !EMAIL_RE.test(identity)) {
    return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  }
  if (!reelUrl) {
    return NextResponse.json(
      { error: "Paste the link to your Instagram or TikTok reel." },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  const { data: resolved, error: resolveError } = await supabase.rpc("resolve_program_identity", {
    p_identity: identity,
  });
  if (resolveError) {
    console.error("[creator program] identity lookup failed:", resolveError.message);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  const match = (resolved as { creator_id: string | null; email: string }[] | null)?.[0];
  if (!match) {
    return NextResponse.json(
      { error: "We couldn't find that username. Check it, or use your email instead." },
      { status: 404 },
    );
  }

  const { error: insertError } = await supabase.from("creator_program_submissions").insert({
    creator_id: match.creator_id,
    email: match.email,
    reel_url: reelUrl,
    note,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        {
          error: insertError.message.includes("reel")
            ? "That reel has already been submitted."
            : "You've already applied. We'll get back to you within 48 hours.",
        },
        { status: 409 },
      );
    }
    console.error("[creator program] insert failed:", insertError.message);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, hasAccount: Boolean(match.creator_id) });
}
