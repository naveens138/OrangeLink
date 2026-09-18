"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getOrderBumps,
  setOrderBumps,
  type OrderBumpRow,
} from "@/app/(dashboard)/dashboard/products/actions";
import { formatProductPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

/**
 * Picks which of a creator's other products ride along with this one at
 * checkout, and at what discount. The buyer sees these as tick boxes under
 * the email field; the price they'd actually pay is worked out on the
 * server (lib/payments/pricing.ts), never here.
 */
export function OrderBumpsModal({
  open,
  onClose,
  product,
  products,
}: {
  open: boolean;
  onClose: () => void;
  product: Product;
  /** Every product this creator has, including the one being edited. */
  products: Product[];
}) {
  const [selected, setSelected] = useState<OrderBumpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only this creator's other products, and only ones priced in the same
  // currency — a Razorpay order is single-currency, so a mixed pair could
  // never be charged together.
  const candidates = products.filter(
    (candidate) => candidate.id !== product.id && candidate.currency === product.currency,
  );

  // The modal is mounted only while it's open, so the initial `loading`
  // state is already right and nothing has to be reset here.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getOrderBumps(product.id)
      .then((rows) => {
        if (cancelled) return;
        setSelected(rows);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, product.id]);

  function toggle(productId: string) {
    setSelected((current) =>
      current.some((row) => row.offerProductId === productId)
        ? current.filter((row) => row.offerProductId !== productId)
        : [...current, { offerProductId: productId, discountPercent: null }],
    );
  }

  function setDiscount(productId: string, value: string) {
    const parsed = value.trim() === "" ? null : Number(value);
    setSelected((current) =>
      current.map((row) =>
        row.offerProductId === productId
          ? { ...row, discountPercent: parsed === null || Number.isNaN(parsed) ? null : parsed }
          : row,
      ),
    );
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    const result = await setOrderBumps(product.id, selected);
    setSaving(false);
    if (result.ok) {
      onClose();
    } else {
      setError(result.error);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Order bumps for ${product.name}`}>
      <div className="flex flex-col gap-4">
        <p className="text-small text-text-secondary">
          Offered at checkout as a tick box, before payment. Keep it to one or
          two: a bump works because it&apos;s an easy yes, not because it fills
          the page.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : candidates.length === 0 ? (
          <p className="rounded-md border border-border bg-surface-2 p-4 text-small text-text-secondary">
            You need a second product in {product.currency} before you can offer
            one alongside this.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {candidates.map((candidate) => {
              const row = selected.find((r) => r.offerProductId === candidate.id);
              const checked = Boolean(row);
              return (
                <div
                  key={candidate.id}
                  className={cn(
                    "rounded-md border p-3 transition-colors",
                    checked ? "border-accent bg-accent/[0.06]" : "border-border",
                  )}
                >
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(candidate.id)}
                      className="h-4 w-4 shrink-0 accent-accent"
                    />
                    <span className="min-w-0 flex-1 truncate text-body text-text-primary">
                      {candidate.name}
                    </span>
                    <span className="shrink-0 font-mono text-small text-text-secondary">
                      {formatProductPrice(candidate.price_cents, candidate.currency)}
                    </span>
                  </label>

                  {checked && (
                    <div className="mt-3 flex items-center gap-2 pl-7">
                      <span className="text-small text-text-secondary">Discount</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0"
                        value={row?.discountPercent ?? ""}
                        onChange={(e) => setDiscount(candidate.id, e.target.value)}
                        className="h-9 w-24"
                      />
                      <span className="text-small text-text-secondary">
                        % off, so buyers pay{" "}
                        <span className="font-mono text-text-primary">
                          {formatProductPrice(
                            discountedCents(candidate.price_cents, row?.discountPercent ?? null),
                            candidate.currency,
                          )}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-small text-danger">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || loading}>
            {saving ? "Saving…" : "Save bumps"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function discountedCents(listPriceCents: number, discountPercent: number | null): number {
  if (!discountPercent || discountPercent <= 0) return listPriceCents;
  return Math.max(0, Math.round(listPriceCents * (1 - Math.min(discountPercent, 100) / 100)));
}
