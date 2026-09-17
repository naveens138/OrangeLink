"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/queries/require-admin";
import { PROGRAM_CAP } from "@/lib/creator-program";

export type ReviewResult =
  | { ok: true; status: "approved" | "rejected"; freeUntil: string | null }
  | { ok: false; error: string };

const OUTCOME_ERRORS: Record<string, string> = {
  not_found: "That submission no longer exists.",
  already_approved: "Already approved.",
  already_rejected: "Already rejected.",
  no_account: "This person hasn't signed up yet. Approve once they have an account with this email.",
  full: `All ${PROGRAM_CAP} spots are already claimed.`,
  duplicate: "This creator already has another live application.",
};

/**
 * Approves a reel and grants the creator a free year. The cap, the account
 * lookup and the billing override all happen inside one locked database
 * call (approve_program_submission, migration 0018), so nothing here can
 * approve past the cap or approve without granting the year.
 *
 * Re-checks requireAdmin() itself: a server action is directly callable,
 * so the admin layout's gate alone wouldn't protect it.
 */
export async function approveSubmission(id: string): Promise<ReviewResult> {
  const { email } = await requireAdmin();

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("approve_program_submission", {
    p_submission_id: id,
    p_reviewer: email,
    p_cap: PROGRAM_CAP,
  });
  if (error) return { ok: false, error: error.message };

  const row = (data as { outcome: string; free_until: string | null }[] | null)?.[0];
  if (row?.outcome !== "approved") {
    return { ok: false, error: OUTCOME_ERRORS[row?.outcome ?? ""] ?? "Couldn't approve this one." };
  }

  revalidatePath("/admin/creator-program");
  revalidatePath("/creator-program");
  return { ok: true, status: "approved", freeUntil: row.free_until };
}

export async function rejectSubmission(id: string): Promise<ReviewResult> {
  const { email } = await requireAdmin();

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("creator_program_submissions")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: email })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Only pending submissions can be rejected." };

  revalidatePath("/admin/creator-program");
  return { ok: true, status: "rejected", freeUntil: null };
}
