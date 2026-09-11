import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { ShareButton } from "@/components/public/share-button";
import type { Block, Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";

/**
 * A product in the Shop grid: image on top, then title and price, with the
 * same ⋮ share control the link pills carry. Same layering as the link
 * pill: one link covering the card, the ⋮ sitting above it.
 */
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

  const href = `/${username}/p/${product.id}`;

  // When the page gives this card the full row (an odd last product, marked
  // with data-wide) the image sits in a centred box and the text centres
  // under it, as in the reference, instead of blowing the image up to the
  // full width. The page marks it rather than the card measuring itself
  // because widths can't tell the cases apart: a wide card on a small phone
  // is narrower than a half card on desktop.
  return (
    <div className="group relative h-full">
      <Link
        href={href}
        onClick={() =>
          track({ username, eventType: "block_click", blockId: block.id, productId: product.id })
        }
        className="storefront-pill flex h-full flex-col overflow-hidden rounded-[var(--card-radius)]"
      >
        {/* Half-width cards run the image edge to edge, as the reference
            does; the wide card insets it. `cover` because creators upload
            photos, not cut-outs — `contain` would letterbox them with white
            bars where the reference fills the tile. */}
        <div className="in-data-wide:px-4 in-data-wide:pt-4">
          <div
            className="aspect-square w-full bg-white bg-cover bg-center in-data-wide:mx-auto in-data-wide:max-w-[56%] in-data-wide:rounded-[calc(var(--card-radius)_-_6px)]"
            style={
              product.cover_image_url
                ? { backgroundImage: `url(${product.cover_image_url})` }
                : undefined
            }
          />
        </div>
        <div className="flex-1 px-4 pb-4 pr-11 pt-3 in-data-wide:px-11 in-data-wide:text-center">
          <p className="line-clamp-2 text-[14px] font-medium leading-snug text-text-primary">{product.name}</p>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {formatPrice(product.price_cents, product.currency)}
          </p>
        </div>
      </Link>

      <ShareButton
        url={href}
        title={product.name}
        label={`Share ${product.name}`}
        className="absolute bottom-3 right-2 flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-white hover:text-text-primary"
      >
        <MoreVertical className="h-4 w-4" />
      </ShareButton>
    </div>
  );
}
