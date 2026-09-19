"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Pages that need more than the reading width: the Links editor sits beside
// its live phone preview.
const WIDE = ["/dashboard/links"];

/** The dashboard's content column: landing-page width, wider where a page needs it. */
export function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wide = WIDE.some((p) => pathname.startsWith(p));
  return (
    <main
      className={cn(
        "mx-auto w-full flex-1 px-5 pb-28 pt-8 md:px-8 md:pb-12 md:pt-10",
        wide ? "max-w-[1160px]" : "max-w-[880px]",
      )}
    >
      {children}
    </main>
  );
}
