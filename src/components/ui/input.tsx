import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-12 md:h-11 w-full rounded-md border bg-surface-1 px-4 text-body text-text-primary placeholder:text-text-muted transition-colors duration-[170ms] focus:outline-none focus:ring-2 focus:ring-accent-soft",
          invalid
            ? "border-danger focus:border-danger"
            : "border-border focus:border-border-strong",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
