"use client";

import { usePathname } from "next/navigation";
import { isActive, navItems } from "./nav-items";

/**
 * The "01 / overview" line over every dashboard page, the landing page's
 * section eyebrow. Derived from the route so no page has to set it.
 */
export function PageEyebrow() {
  const pathname = usePathname();
  const index = navItems.findIndex((item) => isActive(item, pathname));
  if (index === -1) return null;

  return (
    <p className="mb-3 font-mono text-label uppercase tracking-[0.1em] text-text-muted">
      <span className="text-[var(--accent-strong)]">{String(index + 1).padStart(2, "0")} / </span>
      {navItems[index].label}
    </p>
  );
}
