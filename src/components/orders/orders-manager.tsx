"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, Search, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface OrderRow {
  id: string;
  status: "pending" | "paid" | "refunded" | "failed";
  totalCents: number;
  currency: string;
  createdAt: string;
  provider: string;
  providerPaymentId: string | null;
  source: string | null;
  buyerEmail: string;
  buyerName: string | null;
  products: string[];
}

export interface TopCustomer {
  email: string;
  name: string | null;
  lifetime_value_cents: number;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "refunded", label: "Refunded" },
  { key: "failed", label: "Failed" },
] as const;

const STATUS_STYLE: Record<OrderRow["status"], string> = {
  paid: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  refunded: "bg-surface-2 text-text-secondary",
  failed: "bg-danger/10 text-danger",
};

/** Totals per currency: a creator selling in USD and INR gets both, never a mixed sum. */
function sumByCurrency(orders: OrderRow[]) {
  const totals = new Map<string, number>();
  for (const o of orders) totals.set(o.currency, (totals.get(o.currency) ?? 0) + o.totalCents);
  return [...totals.entries()].map(([currency, cents]) => formatPrice(cents, currency)).join(" + ");
}

function toCsv(orders: OrderRow[]) {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["Date", "Buyer name", "Buyer email", "Products", "Total", "Currency", "Status", "Source", "Payment ID"];
  const lines = orders.map((o) =>
    [
      o.createdAt.slice(0, 10),
      o.buyerName ?? "",
      o.buyerEmail,
      o.products.join("; "),
      (o.totalCents / 100).toFixed(2),
      o.currency,
      o.status,
      o.source ?? "",
      o.providerPaymentId ?? "",
    ]
      .map((v) => cell(String(v)))
      .join(","),
  );
  return [header.map(cell).join(","), ...lines].join("\n");
}

export function OrdersManager({ orders, topCustomers }: { orders: OrderRow[]; topCustomers: TopCustomer[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");

  const paid = useMemo(() => orders.filter((o) => o.status === "paid"), [orders]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter(
      (o) =>
        (filter === "all" || o.status === filter) &&
        (!q ||
          o.buyerEmail.toLowerCase().includes(q) ||
          (o.buyerName ?? "").toLowerCase().includes(q) ||
          o.products.some((p) => p.toLowerCase().includes(q))),
    );
  }, [orders, filter, query]);

  function exportCsv() {
    const blob = new Blob([toCsv(shown)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orangelink-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border-strong px-6 py-16 text-center">
        <ShoppingBag className="h-6 w-6 text-text-muted" />
        <p className="mt-3 text-h3">No orders yet</p>
        <p className="mt-1 max-w-sm text-body text-text-secondary">
          When someone buys from you, it shows up here right away.
        </p>
        <Link href="/dashboard/products" className="mt-4">
          <Button size="sm" variant="secondary">Add a product</Button>
        </Link>
      </div>
    );
  }

  const customers = new Set(paid.map((o) => o.buyerEmail.toLowerCase())).size;
  // Free claims count as customers but not as sales.
  const sales = paid.filter((o) => o.provider !== "free");
  const stats = [
    { label: "Revenue", value: paid.length ? sumByCurrency(paid) : formatPrice(0) },
    { label: "Paid orders", value: sales.length.toLocaleString() },
    { label: "Customers", value: customers.toLocaleString() },
    {
      label: "Average order",
      value: sales.length && new Set(sales.map((o) => o.currency)).size === 1
        ? formatPrice(Math.round(sales.reduce((s, o) => s + o.totalCents, 0) / sales.length), sales[0].currency)
        : "-",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="font-mono text-label uppercase tracking-[0.1em] text-text-muted">{s.label}</p>
            <p className="mt-2 font-mono text-h3 text-text-primary">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-md border border-border bg-surface-1 p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-sm px-3 py-1 text-small transition-colors",
                filter === f.key ? "bg-background font-medium text-text-primary shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3">
            <Search className="h-3.5 w-3.5 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search buyer or product"
              className="w-44 bg-transparent text-small text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </label>
          <Button size="sm" variant="secondary" onClick={exportCsv} disabled={shown.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-small">
          <thead>
            <tr className="border-b border-border font-mono text-label uppercase tracking-[0.1em] text-text-muted">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Buyer</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" aria-label="Payment" />
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{formatDate(o.createdAt)}</td>
                <td className="px-4 py-3">
                  <p className="text-text-primary">{o.buyerName || o.buyerEmail}</p>
                  {o.buyerName && <p className="text-[12px] text-text-muted">{o.buyerEmail}</p>}
                </td>
                <td className="px-4 py-3 text-text-primary">
                  {o.products.join(", ")}
                  {o.source && <p className="text-[12px] text-text-muted">via {o.source}</p>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-text-primary">
                  {o.provider === "free" ? "Free" : formatPrice(o.totalCents, o.currency)}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-medium capitalize", STATUS_STYLE[o.status])}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {o.provider === "razorpay" && o.providerPaymentId && (
                    <a
                      href={`https://dashboard.razorpay.com/app/payments/${o.providerPaymentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] text-text-secondary hover:text-text-primary"
                    >
                      Razorpay
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                  No orders match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {topCustomers.length > 0 && (
        <div>
          <h2 className="mb-3 text-h3">Top customers</h2>
          <Card className="p-0">
            <ul>
              {topCustomers.map((c) => (
                <li key={c.email} className="flex items-center justify-between border-b border-border px-4 py-3 text-small last:border-0">
                  <span className="min-w-0">
                    <span className="block truncate text-text-primary">{c.name || c.email}</span>
                    {c.name && <span className="block truncate text-[12px] text-text-muted">{c.email}</span>}
                  </span>
                  <span className="font-mono text-text-primary">{formatPrice(c.lifetime_value_cents)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <p className="mt-2 text-[12px] text-text-muted">Lifetime spend on your page.</p>
        </div>
      )}
    </div>
  );
}
