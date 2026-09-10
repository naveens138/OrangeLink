"use client";

import { useState, type ReactNode } from "react";

/**
 * Shares a URL through the native share sheet where there is one (phones,
 * mostly), and otherwise copies it and says so. Backs both the page's share
 * button and the ⋮ on every link and product.
 *
 * Stops propagation because on link pills it sits on top of the card's
 * full-size anchor: without that, sharing a link would also open it.
 */
export function ShareButton({
  url,
  title,
  label,
  className,
  children,
}: {
  url: string;
  title?: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function share(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const absolute = new URL(url, window.location.href).toString();

    if (navigator.share) {
      try {
        await navigator.share({ url: absolute, title });
        return;
      } catch {
        // Dismissing the sheet throws; that's a choice, not a failure, and
        // there's nothing to fall back to.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — nothing useful left to do */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={label}
      title={copied ? "Link copied" : label}
      className={className}
    >
      {copied ? <span className="text-[11px] font-medium">Copied</span> : children}
    </button>
  );
}
