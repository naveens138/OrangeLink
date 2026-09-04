import Link from "next/link";
import { track } from "@/lib/analytics/client";
import type { Block, Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export function ProductBlock({
  block,
  username,
  products,
}: {
  block: Block;
  username: string;
  products: Product[];
}) {
  const config = block.config as { product_id?: string };
  const product = products.find((p) => p.id === config.product_id);
  if (!product) return null;

  return (
    <Link
      href={`/${username}/p/${product.id}`}
      onClick={() => track({ username, eventType: "block_click", blockId: block.id, productId: product.id })}
      className="flex items-center gap-4 rounded-lg border border-current/15 p-3 transition-transform duration-[170ms] hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className="h-16 w-16 shrink-0 rounded-md bg-current/10" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium">{product.name}</p>
        <p className="truncate text-small opacity-60">{product.description}</p>
      </div>
      <p className="shrink-0 font-mono text-body">
        {formatPrice(product.price_cents, product.currency)}
      </p>
    </Link>
  );
}
