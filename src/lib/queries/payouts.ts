import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export interface CreatorBalance {
  creatorId: string;
  username: string;
  displayName: string | null;
  currency: string;
  netOwedCents: number;
  paidOutCents: number;
  balanceCents: number;
}

export interface Payout {
  id: string;
  creatorId: string;
  amountCents: number;
  currency: string;
  status: "pending" | "paid" | "failed";
  method: string | null;
  reference: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
}

/**
 * Runs on the service role — this is an admin-only view of every creator's
 * finances, not something any single creator's RLS should be able to
 * return in one query. The gate is /admin's own requireAdmin(), not RLS.
 */
export async function getCreatorBalances(): Promise<CreatorBalance[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("creator_payout_balances")
    .select("creator_id, username, display_name, currency, net_owed_cents, paid_out_cents, balance_cents")
    .order("balance_cents", { ascending: false });

  return (data ?? []).map((row) => ({
    creatorId: row.creator_id,
    username: row.username,
    displayName: row.display_name,
    currency: row.currency,
    netOwedCents: row.net_owed_cents,
    paidOutCents: row.paid_out_cents,
    balanceCents: row.balance_cents,
  }));
}

export async function getPayoutHistory(creatorId?: string): Promise<Payout[]> {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("payouts")
    .select("id, creator_id, amount_cents, currency, status, method, reference, notes, paid_at, created_at")
    .order("created_at", { ascending: false });

  if (creatorId) query = query.eq("creator_id", creatorId);

  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: row.id,
    creatorId: row.creator_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    method: row.method,
    reference: row.reference,
    notes: row.notes,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  }));
}
