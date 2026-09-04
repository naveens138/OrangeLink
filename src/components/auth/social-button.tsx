import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SocialButton({
  icon,
  children,
  className,
  ...props
}: {
  icon: ReactNode;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-12 md:h-11 w-full items-center justify-center gap-2.5 rounded-pill border border-border bg-surface-1 text-body font-medium text-text-primary transition-colors duration-[170ms] hover:border-border-strong hover:bg-surface-2",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
