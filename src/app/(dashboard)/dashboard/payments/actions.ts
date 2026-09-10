"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PaymentsState = { error: string } | { ok: true } | null;

const KEY_ID_RE = /^rzp_(test|live)_[A-Za-z0-9]{10,}$/;

/**
 * Connects (or re-connects) the creator's own Razorpay account.
 *
 * Secrets go into Supabase Vault through the SECURITY DEFINER wrappers from
 * migrations/0011 — the row itself only ever holds a uuid reference, and
 * the plaintext is readable exclusively by service_role at payment time.
 * Everything here runs on the cookie-bound client, so RLS confines the
 * write to the caller's own row.
 */
export async function connectRazorpay(
  _prev: PaymentsState,
  formData: FormData,
): Promise<PaymentsState> {
  const keyId = String(formData.get("key_id") ?? "").trim();
  const keySecret = String(formData.get("key_secret") ?? "").trim();
  const webhookSecret = String(formData.get("webhook_secret") ?? "").trim();

  if (!KEY_ID_RE.test(keyId)) {
    return {
      error:
        "That doesn't look like a Razorpay Key ID. It starts with rzp_test_ or rzp_live_.",
    };
  }
  if (keySecret.length < 12) {
    return { error: "Enter the Key Secret that was issued with that Key ID." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data: existing } = await supabase
    .from("creator_payment_accounts")
    .select("creator_id, key_secret_id, webhook_secret_id")
    .eq("creator_id", user.id)
    .maybeSingle();

  // Rotate the existing vault entries in place where we can, so reconnecting
  // doesn't leave orphaned secrets behind.
  let keySecretId: string;
  if (existing?.key_secret_id) {
    const { error } = await supabase.rpc("update_payment_secret", {
      p_secret_id: existing.key_secret_id,
      new_secret: keySecret,
    });
    if (error) return { error: error.message };
    keySecretId = existing.key_secret_id;
  } else {
    const { data, error } = await supabase.rpc("store_payment_secret", {
      new_secret: keySecret,
    });
    if (error) return { error: error.message };
    keySecretId = data as string;
  }

  let webhookSecretId: string | null = existing?.webhook_secret_id ?? null;
  if (webhookSecret) {
    if (webhookSecretId) {
      const { error } = await supabase.rpc("update_payment_secret", {
        p_secret_id: webhookSecretId,
        new_secret: webhookSecret,
      });
      if (error) return { error: error.message };
    } else {
      const { data, error } = await supabase.rpc("store_payment_secret", {
        new_secret: webhookSecret,
      });
      if (error) return { error: error.message };
      webhookSecretId = data as string;
    }
  }

  const { error: upsertError } = await supabase
    .from("creator_payment_accounts")
    .upsert({
      creator_id: user.id,
      provider: "razorpay",
      key_id: keyId,
      key_secret_id: keySecretId,
      webhook_secret_id: webhookSecretId,
      is_live: keyId.startsWith("rzp_live_"),
      updated_at: new Date().toISOString(),
    });

  if (upsertError) return { error: upsertError.message };

  revalidatePath("/dashboard/payments");
  return { ok: true };
}

/** Disconnects the account and destroys the stored secrets. */
export async function disconnectRazorpay(): Promise<PaymentsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data: existing } = await supabase
    .from("creator_payment_accounts")
    .select("key_secret_id, webhook_secret_id")
    .eq("creator_id", user.id)
    .maybeSingle();

  // Secrets first, row second. delete_payment_secret authorises by looking
  // the caller up *through* this row, so dropping the row first would make
  // every secret deletion fail its ownership check and strand the
  // credentials in the vault, still decryptable.
  for (const id of [existing?.key_secret_id, existing?.webhook_secret_id]) {
    if (id) await supabase.rpc("delete_payment_secret", { p_secret_id: id });
  }

  const { error } = await supabase
    .from("creator_payment_accounts")
    .delete()
    .eq("creator_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/payments");
  return { ok: true };
}
