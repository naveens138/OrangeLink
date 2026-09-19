import { cn } from "@/lib/utils";

/**
 * The little segmented bar over the signup steps. Purely an orientation
 * device: it says how much is left, which is the whole reason a multi step
 * signup feels shorter than one long form.
 */
export function OnboardingProgress({
  steps,
  current,
  className,
}: {
  steps: number;
  /** 1-based. */
  current: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-center gap-1.5", className)}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={steps}
      aria-valuenow={current}
      aria-label={`Step ${current} of ${steps}`}
    >
      {Array.from({ length: steps }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-12 rounded-pill transition-colors duration-[250ms]",
            i < current ? "bg-accent" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}
