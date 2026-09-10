import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // The landing page's feature card: hairline edge on off-white.
        "rounded-md border border-border bg-surface-1 p-5 md:p-6",
        className,
      )}
      {...props}
    />
  );
}
