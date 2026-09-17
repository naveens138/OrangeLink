import { MoreVertical } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { ShareButton } from "@/components/public/share-button";
import type { Block, LinkBlockConfig } from "@/lib/types";

/**
 * A link as a Linktree-style pill: circular thumbnail on the left, title
 * centred across the full width, a ⋮ on the right that shares the link.
 *
 * The whole pill is one anchor, and the ⋮ is layered above it rather than
 * nested inside it — a <button> inside an <a> is invalid HTML, and browsers
 * resolve the click unpredictably.
 */
export function LinkBlock({ block, username }: { block: Block; username: string }) {
  const config = block.config as LinkBlockConfig;
  const label = config.label ?? "Untitled link";
  const url = config.url ?? "#";
  // A link to somewhere on OrangeLink (the creator's own product, say) stays
  // in the tab; only outside links open a new one.
  const external = !url.startsWith("/");

  return (
    <div className="group relative">
      <a
        href={url}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={() => track({ username, eventType: "block_click", blockId: block.id })}
        className="storefront-pill storefront-link flex min-h-[64px] w-full items-center rounded-[var(--link-radius)] p-2"
      >
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-[max(6px,calc(var(--link-radius)_-_8px))] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
          {config.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.image} alt="" loading="lazy" className="h-full w-full object-cover" />
          )}
        </span>
        <span className="min-w-0 flex-1 px-3 text-center text-[14px] font-medium leading-snug text-[var(--pill-ink)]">
          {label}
        </span>
        {/* Keeps the title centred against the thumbnail on the other side. */}
        <span className="h-12 w-12 shrink-0" aria-hidden />
      </a>

      <ShareButton
        url={url}
        title={label}
        label={`Share ${label}`}
        className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--pill-ink-soft)] transition-colors hover:bg-black/5 hover:text-[var(--pill-ink)]"
      >
        <MoreVertical className="h-4 w-4" />
      </ShareButton>
    </div>
  );
}
