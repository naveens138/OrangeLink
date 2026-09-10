import Link from "next/link";
import { Card } from "@/components/ui/card";
import { FirstRunChoice } from "@/components/dashboard/first-run-choice";
import { requireCreator } from "@/lib/queries/dashboard";
import { getFunnelStats } from "@/lib/queries/analytics";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export default async function DashboardOverviewPage() {
  const { creator, page, products } = await requireCreator();

  const supabase = await createClient();
  const since = new Date();
  since.setTime(since.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();

  const [funnel, { count: subscriberCount }] = await Promise.all([
    getFunnelStats(supabase, creator.id, sinceIso),
    supabase
      .from("email_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creator.id)
      .is("unsubscribed_at", null),
  ]);

  const stats = [
    { label: "Page views (30d)", value: funnel.pageViews.toLocaleString() },
    { label: "Link clicks (30d)", value: funnel.blockClicks.toLocaleString() },
    { label: "Revenue (30d)", value: formatPrice(funnel.revenueCents) },
    { label: "Subscribers", value: (subscriberCount ?? 0).toLocaleString() },
  ];

  // The one branch worth asking about up front: moving a page across, or
  // building one. Only while the page is still empty.
  const isEmptyPage = page.blocks.length === 0;

  return (
    <div className="flex flex-col gap-8">
      {isEmptyPage && <FirstRunChoice username={creator.username} />}

      <div>
        <h1 className="text-h2">Overview</h1>
        <p className="mt-1 text-body text-text-secondary">
          {page.published ? (
            <>
              Your page is live at{" "}
              <Link
                href={`/${creator.username}`}
                target="_blank"
                className="font-medium text-accent"
              >
                orangelink.co/{creator.username}
              </Link>
            </>
          ) : (
            "Your page isn't published yet."
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-label uppercase tracking-wide text-text-muted">
              {stat.label}
            </p>
            <p className="mt-2 font-mono text-h3 text-text-primary">
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-h3">Products</h2>
          <Link
            href="/dashboard/products"
            className="text-small font-medium text-accent"
          >
            View all
          </Link>
        </div>
        {products.length === 0 ? (
          <p className="mt-4 text-body text-text-secondary">
            No products yet.
          </p>
        ) : (
          <div className="mt-4 flex flex-col divide-y divide-border">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-body text-text-primary">
                    {product.name}
                  </p>
                  <p className="truncate text-small text-text-muted">
                    {product.description}
                  </p>
                </div>
                <p className="ml-4 shrink-0 font-mono text-body text-text-primary">
                  {formatPrice(product.price_cents, product.currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
