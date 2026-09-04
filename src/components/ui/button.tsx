import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "sm";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover hover:-translate-y-px active:scale-[0.97] active:translate-y-0",
  secondary:
    "bg-surface-2 text-text-primary border border-border hover:border-border-strong active:scale-[0.97]",
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary active:scale-[0.97]",
  danger:
    "bg-danger text-white hover:brightness-110 active:scale-[0.97]",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-12 md:h-11 px-5 text-body",
  sm: "h-9 px-4 text-small",
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
          "inline-flex items-center justify-center gap-2 rounded-pill font-medium whitespace-nowrap transition-all duration-[170ms] ease-out disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          // sizeClasses before variantClasses: tailwind-merge treats the
          // project's custom text-size utilities (text-body/text-small) as
          // colliding with variant text colors (text-white etc.) since
          // neither matches its built-in font-size/color keyword lists —
          // whichever comes last in this list wins the merge, so the
          // variant's color must be last or it gets silently dropped.
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
