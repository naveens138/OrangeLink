import "server-only";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface FunnelStats {
  pageViews: number;
  blockClicks: number;
  productViews: number;
  checkoutsStarted: number;
  checkoutsCompleted: number;
  revenueCents: number;
}

export interface SourceRow {
  source: string;
  visitors: number;
  checkouts: number;
  revenueCents: number;
}

const EVENT_TYPES = [
  "page_view",
  "block_click",
  "product_view",
  "checkout_start",
  "checkout_complete",
] as const;

/**
 * Attribution fields are denormalized onto `orders` at checkout time (per
 * BUILD_BRIEF.md §5), so revenue and checkout counts here read `orders`
 * directly rather than joining through the event stream — the event stream
 * (`analytics_events`) is only for the funnel counts, matching that same
 * "deep drill-down only" split.
 */
export async function getFunnelStats(
  supabase: SupabaseClient,
  creatorId: string,
  sinceIso: string,
): Promise<FunnelStats> {
  const counts = await Promise.all(
    EVENT_TYPES.map((type) =>
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorId)
        .eq("event_type", type)
        .gte("occurred_at", sinceIso),
    ),
  );

  const { data: orders } = await supabase
    .from("orders")
    .select("total_cents")
    .eq("creator_id", creatorId)
    .eq("status", "paid")
    .gte("paid_at", sinceIso);

  const revenueCents = (orders ?? []).reduce((sum, o) => sum + o.total_cents, 0);

  return {
    pageViews: counts[0].count ?? 0,
    blockClicks: counts[1].count ?? 0,
    productViews: counts[2].count ?? 0,
    checkoutsStarted: counts[3].count ?? 0,
    checkoutsCompleted: counts[4].count ?? 0,
    revenueCents,
  };
}

/** Visitor counts and paid-order counts/revenue, grouped by first-touch utm_source ("Direct" when absent). */
export async function getSourceBreakdown(
  supabase: SupabaseClient,
  creatorId: string,
  sinceIso: string,
): Promise<SourceRow[]> {
  const [{ data: visitors }, { data: orders }] = await Promise.all([
    supabase
      .from("visitors")
      .select("utm_source")
      .eq("creator_id", creatorId)
      .gte("first_seen_at", sinceIso),
    supabase
      .from("orders")
      .select("attribution_utm, total_cents")
      .eq("creator_id", creatorId)
      .eq("status", "paid")
      .gte("paid_at", sinceIso),
  ]);

  const key = (s: string | null | undefined) => s || "Direct";
  const bySource = new Map<string, SourceRow>();
  const row = (k: string) => {
    const existing = bySource.get(k);
    if (existing) return existing;
    const created: SourceRow = { source: k, visitors: 0, checkouts: 0, revenueCents: 0 };
    bySource.set(k, created);
    return created;
  };

  for (const v of visitors ?? []) {
    row(key(v.utm_source)).visitors += 1;
  }
  for (const o of orders ?? []) {
    const utm = o.attribution_utm as Record<string, string> | null;
    const r = row(key(utm?.utm_source));
    r.checkouts += 1;
    r.revenueCents += o.total_cents;
  }

  return [...bySource.values()].sort((a, b) => b.visitors - a.visitors);
}
