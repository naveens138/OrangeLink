"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { DEFAULT_PRESET } from "@/lib/theme-presets";
import { grantTrial } from "@/lib/billing/trial";

export type AuthState = { error: string } | null;

/**
 * Signup can end two ways, depending on whether this Supabase project has
 * email confirmation switched on: either a session (straight into the
 * store) or a confirmation mail (nothing exists yet but the account).
 */
export type SignupState = { error: string } | { confirmEmail: string } | null;

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

/**
 * The signup wizard's last step: the username picked on the first step
 * arrives with the account details, and one submit creates the account, the
 * creator, their page and their trial.
 *
 * The username is re-checked here rather than trusted from the first step —
 * it's a client-side check over a public endpoint, and somebody else may
 * have taken the name in the meantime anyway.
 */
export async function createAccount(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const username = String(formData.get("username") ?? "").toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const check = await checkUsernameAvailable(username);
  if (!check.available) return { error: check.reason ?? "That username is unavailable." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // No session means this project requires email confirmation, which it
  // currently does. The account exists but nobody is signed in yet, so
  // nothing is created for them: a creator row here would hold the username
  // for an address that may never be confirmed, and the redirect it used to
  // do landed on a page that bounces anyone without a session.
  //
  // `data.user` comes back either way, so the session is what's checked.
  if (!data.session) {
    return { confirmEmail: email };
  }

  const created = await createCreator(data.user!.id, username, displayName || username);
  if ("error" in created) return created;

  revalidatePath("/", "layout");
  redirect("/welcome");
}

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

  const created = await createCreator(
    user.id,
    username,
    user.email?.split("@")[0] ?? username,
  );
  if ("error" in created) return created;

  revalidatePath("/", "layout");
  redirect("/welcome");
}

/**
 * A creator, their primary page and their free trial, together.
 *
 * The page is created alongside the creator because a creator without one
 * has nothing for /[username] to render; the trial is granted here so every
 * route into an account starts the clock, whether they came through the
 * signup wizard or Google.
 */
async function createCreator(
  userId: string,
  username: string,
  displayName: string,
): Promise<{ ok: true } | { error: string }> {
  const admin = createServiceRoleClient();

  const { error: creatorError } = await admin.from("creators").insert({
    id: userId,
    username,
    display_name: displayName,
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
    creator_id: userId,
    slug: username,
    is_primary: true,
    title: username,
    theme: { preset: DEFAULT_PRESET, tabbed_view: true },
    published: true,
  });
  if (pageError) return { error: pageError.message };

  await grantTrial(userId);
  return { ok: true };
}
