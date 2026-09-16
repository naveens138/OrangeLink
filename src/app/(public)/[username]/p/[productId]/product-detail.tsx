"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckoutModal } from "@/components/checkout/checkout-modal";
import { track } from "@/lib/analytics/client";
import { formatProductPrice } from "@/lib/format";
import type { Creator, Product } from "@/lib/types";

export function ProductDetail({
  creator,
  product,
}: {
  creator: Creator;
  product: Product;
}) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    track({ username: creator.username, eventType: "product_view", productId: product.id });
    // Fire once per page load only — not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen justify-center bg-background px-4 py-10 md:px-6">
      <div className="w-full max-w-[560px]">
        <Link
          href={`/${creator.username}`}
          className="mb-6 inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {creator.display_name ?? creator.username}
        </Link>

        <div className="aspect-[4/3] w-full rounded-lg bg-surface-2" />

        <h1 className="mt-6 text-h1">{product.name}</h1>
        <p className="mt-3 text-body-lg text-text-secondary">
          {product.description}
        </p>

        <div className="mt-8 flex items-center justify-between rounded-lg border border-border bg-surface-1 p-5">
          <span className="font-mono text-h2">
            {formatProductPrice(product.price_cents, product.currency)}
          </span>
          <Button onClick={() => setCheckoutOpen(true)}>
            {product.price_cents === 0 ? "Get it free" : "Buy now"}
          </Button>
        </div>
      </div>

      <CheckoutModal
        product={product}
        username={creator.username}
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />
    </div>
  );
}
