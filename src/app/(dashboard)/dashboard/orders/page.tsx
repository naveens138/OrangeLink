import { requireCreator } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";
import { OrdersManager, type OrderRow, type TopCustomer } from "@/components/orders/orders-manager";

export default async function OrdersPage() {
  const { userId } = await requireCreator();
  const supabase = await createClient();

  // RLS confines all three reads to this creator's own rows (order_items via
  // migration 0015). Capped at the latest 500 orders; the CSV export covers
  // what's shown.
  const [{ data: orders }, { data: customers }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, status, total_cents, currency, created_at, paid_at, payment_provider, provider_payment_id, attribution_source, customers(email, name), order_items(quantity, unit_price_cents, products(name))",
      )
      .eq("creator_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("customers")
      .select("email, name, lifetime_value_cents")
      .eq("creator_id", userId)
      .gt("lifetime_value_cents", 0)
      .order("lifetime_value_cents", { ascending: false })
      .limit(5),
  ]);

  type Raw = {
    id: string;
    status: OrderRow["status"];
    total_cents: number;
    currency: string;
    created_at: string;
    paid_at: string | null;
    payment_provider: string;
    provider_payment_id: string | null;
    attribution_source: string | null;
    customers: { email: string; name: string | null } | null;
    order_items: { quantity: number; unit_price_cents: number; products: { name: string } | null }[];
  };

  const rows: OrderRow[] = ((orders ?? []) as unknown as Raw[]).map((o) => ({
    id: o.id,
    status: o.status,
    totalCents: o.total_cents,
    currency: o.currency,
    createdAt: o.created_at,
    provider: o.payment_provider,
    providerPaymentId: o.provider_payment_id,
    source: o.attribution_source,
    buyerEmail: o.customers?.email ?? "",
    buyerName: o.customers?.name ?? null,
    products: o.order_items.map((i) => i.products?.name ?? "Deleted product"),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Orders</h1>
        <p className="mt-1 max-w-2xl text-body text-text-secondary">
          Every sale from your page. Money goes straight to your Razorpay account; this is your
          record of who bought what.
        </p>
      </div>
      <OrdersManager orders={rows} topCustomers={(customers ?? []) as TopCustomer[]} />
    </div>
  );
}
