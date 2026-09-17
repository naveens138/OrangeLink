import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { EMAIL_RE } from "@/lib/creator-program";

/** Adds an email to the waitlist for the next Creator Program round. */
export async function POST(request: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("creator_program_waitlist").insert({ email });

  // Already on the list is still a success from their side.
  if (error && error.code !== "23505") {
    console.error("[creator program] waitlist insert failed:", error.message);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
