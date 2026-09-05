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
      className="flex flex-col gap-2 rounded-lg border border-current/15 p-3 transition-transform duration-[170ms] hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className="aspect-square w-full rounded-md bg-current/10" />
      <div className="min-w-0">
        <p className="truncate text-body font-medium">{product.name}</p>
        <p className="truncate text-small opacity-60">{product.description}</p>
      </div>
      <p className="font-mono text-body">
        {formatPrice(product.price_cents, product.currency)}
      </p>
    </Link>
  );
}
