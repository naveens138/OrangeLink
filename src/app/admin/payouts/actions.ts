"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/queries/require-admin";
import type { Payout } from "@/lib/queries/payouts";

export type RecordPayoutResult = { ok: true; payout: Payout } | { ok: false; error: string };

/**
 * Records that a payout was actually sent (real bank transfer, handled
 * entirely outside this app) — a ledger entry, not a money-moving action.
 * Re-checks requireAdmin() itself rather than trusting the page that
 * rendered the form: a server action is directly callable, so page-level
 * gating alone wouldn't stop someone from invoking this action straight.
 */
export async function recordPayout(formData: FormData): Promise<RecordPayoutResult> {
  await requireAdmin();

  const creatorId = String(formData.get("creatorId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const currency = String(formData.get("currency") ?? "USD").toUpperCase();
  const method = String(formData.get("method") ?? "").trim() || null;
  const reference = String(formData.get("reference") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const amountCents = Math.round(Number(amountRaw) * 100);
  if (!creatorId || !Number.isFinite(amountCents) || amountCents <= 0) {
    return { ok: false, error: "A creator and a positive amount are required." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("payouts")
    .insert({
      creator_id: creatorId,
      amount_cents: amountCents,
      currency,
      status: "paid",
      method,
      reference,
      notes,
      paid_at: new Date().toISOString(),
    })
    .select("id, creator_id, amount_cents, currency, status, method, reference, notes, paid_at, created_at")
    .single();

  if (error || !data) {
    return { ok: false, error: "Couldn't record this payout. Try again." };
  }

  return {
    ok: true,
    payout: {
      id: data.id,
      creatorId: data.creator_id,
      amountCents: data.amount_cents,
      currency: data.currency,
      status: data.status,
      method: data.method,
      reference: data.reference,
      notes: data.notes,
      paidAt: data.paid_at,
      createdAt: data.created_at,
    },
  };
}
