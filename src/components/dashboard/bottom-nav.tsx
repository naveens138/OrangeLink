"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { isActive, navItems } from "./nav-items";

/**
 * Phone navigation in the landing page's style: frosted white, a hairline
 * on top, quiet grey icons with the active tab in ink.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = navItems.filter((i) => i.primary);
  const rest = navItems.filter((i) => !i.primary);
  const restActive = rest.some((i) => isActive(i, pathname));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        {primary.map((item) => {
          const active = isActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-2 text-[10px] font-medium transition-colors",
                active ? "text-text-primary" : "text-text-muted",
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center gap-1 px-2 text-[10px] font-medium",
            restActive ? "text-text-primary" : "text-text-muted",
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="grid grid-cols-3 gap-2">
          {rest.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-md border px-3 py-4 text-center text-small transition-colors",
                isActive(item, pathname)
                  ? "border-border-strong bg-surface-2 text-text-primary"
                  : "border-border bg-surface-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </Modal>
    </>
  );
}
