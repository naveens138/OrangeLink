"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand";
import { cn } from "@/lib/utils";
import { isActive, navItems } from "./nav-items";

const groups = ["Page", "Sell", "Grow", "Account"] as const;

/**
 * Desktop navigation, set like the landing page: white, a hairline edge,
 * the logo lockup from the landing nav, and mono section eyebrows over
 * small, quiet links. The active item is marked in ink, not orange, the
 * way the landing page keeps orange for punctuation.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-[220px] md:shrink-0 md:flex-col md:border-r md:border-border md:bg-background">
      <div className="flex h-14 items-center px-5">
        <Link href="/" className="inline-flex">
          <BrandLockup />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-6 pt-3">
        {groups.map((group) => (
          <div key={group}>
            <p className="px-2 pb-1.5 font-mono text-label uppercase tracking-[0.1em] text-text-muted">
              {group}
            </p>
            <div className="flex flex-col gap-px">
              {navItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const active = isActive(item, pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-small transition-colors duration-150",
                        active
                          ? "bg-surface-2 font-medium text-text-primary"
                          : "text-text-secondary hover:bg-surface-1 hover:text-text-primary",
                      )}
                    >
                      <item.icon
                        className={cn("h-[15px] w-[15px] shrink-0", active ? "text-text-primary" : "text-text-muted")}
                      />
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
