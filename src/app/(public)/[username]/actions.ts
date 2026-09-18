"use server";

import { unlockBlock as fetchUnlockedBlock, type UnlockBlockResult } from "@/lib/queries/public-page";
import { visitorKeyFromRequest } from "@/lib/visitor-key";

/**
 * Called by the gates on a public page. Anyone can post to this, so it takes
 * nothing on trust: the block is looked up on the creator's published page
 * and a password is checked in the database before anything comes back, with
 * wrong guesses rate limited per visitor.
 */
export async function unlockBlock(
  username: string,
  blockId: string,
  password: string | null,
): Promise<UnlockBlockResult> {
  if (typeof username !== "string" || typeof blockId !== "string") {
    return { ok: false, reason: "not_found" };
  }
  if (password !== null && (typeof password !== "string" || password.length > 200)) {
    return { ok: false, reason: "wrong_password" };
  }
  return fetchUnlockedBlock(username, blockId, password, await visitorKeyFromRequest());
}
