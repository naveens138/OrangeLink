"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | null;

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const RESERVED = new Set([
  "admin",
  "api",
  "app",
  "dashboard",
  "help",
  "login",
  "settings",
  "signup",
  "support",
  "www",
]);

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  redirect("/claim-username");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const next = String(formData.get("next") ?? "") || "/dashboard";
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Availability check for the claim-username screen. Runs with the service
 * role because an unauthenticated visitor cannot read `creators` under RLS,
 * and only ever returns a boolean — never another creator's row.
 */
export async function checkUsernameAvailable(
  username: string,
): Promise<{ available: boolean; reason?: string }> {
  if (!USERNAME_RE.test(username)) {
    return {
      available: false,
      reason: "3-20 characters, lowercase letters, numbers, underscores.",
    };
  }
  if (RESERVED.has(username)) {
    return { available: false, reason: "That username is reserved." };
  }

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("creators")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  return data
    ? { available: false, reason: "That username is taken." }
    : { available: true };
}

export async function claimUsername(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const check = await checkUsernameAvailable(username);
  if (!check.available) return { error: check.reason ?? "Unavailable." };

  const admin = createServiceRoleClient();

  // An account that already claimed a username must not fall through to the
  // insert below: it would fail on the creators primary key and surface as
  // "that username was just taken", which is not what happened.
  const { data: existing } = await admin
    .from("creators")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) redirect("/dashboard");

  // The creator row and its primary page are created together — a creator
  // without a page has nothing for /[username] to render.

  const { error: creatorError } = await admin.from("creators").insert({
    id: user.id,
    username,
    display_name: user.email?.split("@")[0] ?? username,
    onboarding_completed: true,
  });
  if (creatorError) {
    // 23505 = unique_violation: someone claimed it between check and insert.
    return {
      error:
        creatorError.code === "23505"
          ? "That username was just taken. Try another."
          : creatorError.message,
    };
  }

  const { error: pageError } = await admin.from("pages").insert({
    creator_id: user.id,
    slug: username,
    is_primary: true,
    title: username,
    theme: { preset: "minimal" },
    published: true,
  });
  if (pageError) return { error: pageError.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
