"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Plus, Tag, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createCoupon, deleteCoupon, type Coupon } from "@/app/(dashboard)/dashboard/coupons/actions";
import { formatProductPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export function CouponsManager({
  initialCoupons,
  products,
}: {
  initialCoupons: Coupon[];
  products: Product[];
}) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await createCoupon(new FormData(e.currentTarget));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCoupons((current) => [result.coupon, ...current]);
    setFormOpen(false);
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    const previous = coupons;
    setCoupons((current) => current.filter((coupon) => coupon.id !== id));
    const result = await deleteCoupon(id);
    if (!result.ok) setCoupons(previous);
    setDeletingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2">Discount codes</h1>
          <p className="mt-1 text-body text-text-secondary">
            Buyers enter these at checkout, before they pay.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setError(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New code
        </Button>
      </div>

      {coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <Tag className="h-6 w-6 text-text-muted" />
          <p className="mt-3 text-body text-text-secondary">
            No codes yet. Make one for a launch or a collaboration.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-body text-text-primary">{coupon.code}</p>
                <p className="mt-0.5 text-small text-text-secondary">
                  {describe(coupon, products)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-body text-text-primary">
                  {coupon.times_redeemed}
                  {coupon.max_redemptions !== null ? ` / ${coupon.max_redemptions}` : ""}
                </p>
                <p className="text-small text-text-muted">used</p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(coupon.id)}
                disabled={deletingId === coupon.id}
                aria-label={`Delete ${coupon.code}`}
                className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="New discount code">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <Field label="Code" hint="Buyers can type it in any case">
            {(props) => (
              <Input {...props} name="code" required placeholder="LAUNCH20" autoCapitalize="characters" />
            )}
          </Field>

          <div className="flex gap-3">
            <Field label="Type">
              {(props) => (
                <select
                  {...props}
                  name="discount_type"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                  className="h-11 w-full rounded-md border border-border bg-surface-1 px-3 text-body text-text-primary"
                >
                  <option value="percent">Percent off</option>
                  <option value="fixed">Fixed amount off</option>
                </select>
              )}
            </Field>
            <Field label={discountType === "percent" ? "Percent" : "Amount"}>
              {(props) => (
                <Input
                  {...props}
                  name="discount_value"
                  type="number"
                  min={discountType === "percent" ? 1 : 0.01}
                  max={discountType === "percent" ? 100 : undefined}
                  step={discountType === "percent" ? 1 : 0.01}
                  required
                  placeholder={discountType === "percent" ? "20" : "5.00"}
                />
              )}
            </Field>
          </div>

          <Field label="Applies to">
            {(props) => (
              <select
                {...props}
                name="product_id"
                className="h-11 w-full rounded-md border border-border bg-surface-1 px-3 text-body text-text-primary"
              >
                <option value="">Everything</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <div className="flex gap-3">
            <Field label="Limit" hint="Optional">
              {(props) => (
                <Input {...props} name="max_redemptions" type="number" min={1} step={1} placeholder="No limit" />
              )}
            </Field>
            <Field label="Expires" hint="Optional">
              {(props) => <Input {...props} name="expires_at" type="date" />}
            </Field>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-small text-danger">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create code"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function describe(coupon: Coupon, products: Product[]): string {
  const product = coupon.product_id
    ? products.find((p) => p.id === coupon.product_id)
    : null;

  const amount =
    coupon.discount_type === "percent"
      ? `${coupon.discount_value}% off`
      : `${formatProductPrice(Math.round(coupon.discount_value * 100), product?.currency ?? "USD")} off`;

  const scope = coupon.product_id
    ? product
      ? product.name
      : "a deleted product"
    : "everything";

  const expiry = coupon.expires_at
    ? new Date(coupon.expires_at) < new Date()
      ? " · expired"
      : ` · until ${new Date(coupon.expires_at).toLocaleDateString()}`
    : "";

  return `${amount} on ${scope}${expiry}`;
}
