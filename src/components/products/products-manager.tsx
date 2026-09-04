"use client";

import { useState } from "react";
import { AlertCircle, Package, Plus, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductFormModal } from "./product-form-modal";
import { deleteProduct } from "@/app/(dashboard)/dashboard/products/actions";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductsManager({
  initialProducts,
  dodoConfigured,
}: {
  initialProducts: Product[];
  dodoConfigured: boolean;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(product: Product) {
    setEditing(product);
    setFormOpen(true);
  }
  function onSaved(product: Product) {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      return exists
        ? prev.map((p) => (p.id === product.id ? product : p))
        : [...prev, product];
    });
  }
  async function onDelete(id: string) {
    setDeletingId(id);
    const previous = products;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    const result = await deleteProduct(id);
    if (!result.ok) setProducts(previous);
    setDeletingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2">Products</h1>
          <p className="mt-1 text-body text-text-secondary">
            Digital products, bookings, and coaching offers.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New product
        </Button>
      </div>

      {!dodoConfigured && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-small text-warning">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Payments aren&apos;t connected yet — products save normally, but
            checkout won&apos;t work until Dodo Payments keys are added.
          </span>
        </div>
      )}

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <Package className="h-6 w-6 text-text-muted" />
          <p className="mt-3 text-body text-text-secondary">
            No products yet — create one to start selling.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col">
              <div className="mb-4 aspect-[4/3] rounded-md bg-surface-2" />
              <p className="text-body font-medium text-text-primary">
                {product.name}
              </p>
              <p className="mt-1 line-clamp-2 flex-1 text-small text-text-muted">
                {product.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <p className="font-mono text-body text-text-primary">
                  {formatPrice(product.price_cents, product.currency)}
                </p>
                <div className="flex items-center gap-1">
                  {!product.dodo_product_id && (
                    <span
                      title="Not yet synced to payments"
                      className="h-1.5 w-1.5 rounded-full bg-warning"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(product)}
                    aria-label="Edit product"
                    className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(product.id)}
                    disabled={deletingId === product.id}
                    aria-label="Delete product"
                    className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
        dodoConfigured={dodoConfigured}
        onSaved={onSaved}
      />
    </div>
  );
}
