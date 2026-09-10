import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "sm";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// The landing page's two buttons: primary is its black "Claim Your Page",
// secondary its bordered "See a live page". Orange stays out of controls,
// as it does on the landing page.
const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-text-primary text-white hover:opacity-90 active:scale-[0.97]",
  secondary:
    "bg-surface-1 text-text-primary border border-border hover:bg-surface-2 active:scale-[0.97]",
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary active:scale-[0.97]",
  danger:
    "bg-danger text-white hover:opacity-90 active:scale-[0.97]",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 md:h-9 px-3.5 text-small",
  sm: "h-8 px-3 text-small",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "default", ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-[opacity,transform,background-color] duration-100 ease-out disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          // The project's text sizes are registered with tailwind-merge in
          // lib/utils.ts, so size and colour classes no longer cancel out.
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
