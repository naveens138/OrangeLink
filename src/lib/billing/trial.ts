import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { TRIAL_DAYS } from "./trial-length";

/**
 * Starts a new creator's 14 days, at the moment they claim a username.
 *
 * Written as a billing override rather than a column on creators, so a trial
 * and a Creator Program year are the same kind of thing to everything that
 * reads them, distinguished by `reason` (migrations/0022).
 *
 * `onConflict: do nothing` in effect: an existing override is never
 * overwritten, so a creator who somehow arrives here twice can't restart a
 * trial, and one who already holds a program year can't have it downgraded
 * to 14 days.
 */
export async function grantTrial(creatorId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase
    .from("billing_overrides")
    .select("creator_id")
    .eq("creator_id", creatorId)
    .maybeSingle();
  if (existing) return;

  const freeUntil = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("billing_overrides").insert({
    creator_id: creatorId,
    free_until: freeUntil.toISOString(),
    reason: "trial",
    granted_by: "signup",
  });

  // A failed trial grant must never fail the signup that triggered it: the
  // account is already created and the creator is mid-flow. They land on a
  // free plan instead of a trial, which is visible in Settings and fixable,
  // rather than a broken sign-up.
  if (error) {
    console.error(`[trial] couldn't grant trial to ${creatorId}:`, error.message);
  }
}
