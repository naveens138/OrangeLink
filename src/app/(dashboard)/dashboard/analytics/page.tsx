import { createClient } from "@/lib/supabase/server";
import { requireCreator } from "@/lib/queries/dashboard";
import { getFunnelStats, getSourceBreakdown } from "@/lib/queries/analytics";
import { PixelManager } from "@/components/analytics/pixel-manager";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import type { TrackingPixel } from "@/lib/types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function AnalyticsPage() {
  const { creator } = await requireCreator();
  const supabase = await createClient();
  const since = new Date();
  since.setTime(since.getTime() - THIRTY_DAYS_MS);
  const sinceIso = since.toISOString();

  const [funnel, sources, { data: pixels }] = await Promise.all([
    getFunnelStats(supabase, creator.id, sinceIso),
    getSourceBreakdown(supabase, creator.id, sinceIso),
    supabase
      .from("tracking_pixels")
      .select("id, provider, pixel_id, created_at")
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: false }),
  ]);

  const conversionRate =
    funnel.pageViews > 0
      ? `${((funnel.checkoutsCompleted / funnel.pageViews) * 100).toFixed(1)}%`
      : "-";

  const stats = [
    { label: "Page views (30d)", value: funnel.pageViews.toLocaleString() },
    { label: "Clicks (30d)", value: funnel.blockClicks.toLocaleString() },
    { label: "Product views (30d)", value: funnel.productViews.toLocaleString() },
    { label: "Checkouts started (30d)", value: funnel.checkoutsStarted.toLocaleString() },
    { label: "Checkouts completed (30d)", value: funnel.checkoutsCompleted.toLocaleString() },
    { label: "View → purchase (30d)", value: conversionRate },
    { label: "Revenue (30d)", value: formatPrice(funnel.revenueCents) },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2">Analytics</h1>
        <p className="mt-1 text-body text-text-secondary">
          Funnel and attribution, from visit to checkout.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-label uppercase tracking-wide text-text-muted">
              {stat.label}
            </p>
            <p className="mt-2 font-mono text-h3 text-text-primary">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-h3">By source (30d)</h2>
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-center">
            <p className="text-small text-text-secondary">
              No visits in the last 30 days yet.
            </p>
          </div>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-border text-label uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Visitors</th>
                  <th className="px-4 py-3 font-medium">Checkouts</th>
                  <th className="px-4 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((row) => (
                  <tr key={row.source} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text-primary">{row.source}</td>
                    <td className="px-4 py-3 text-text-secondary">{row.visitors}</td>
                    <td className="px-4 py-3 text-text-secondary">{row.checkouts}</td>
                    <td className="px-4 py-3 font-mono text-text-secondary">
                      {formatPrice(row.revenueCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <PixelManager initialPixels={(pixels ?? []) as TrackingPixel[]} />
    </div>
  );
}
