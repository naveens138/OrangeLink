import { cn } from "@/lib/utils";

export function TestimonialCard({
  quote,
  name,
  role,
  initial,
  className,
}: {
  quote: string;
  name: string;
  role: string;
  initial: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-lg border border-border bg-surface-2 p-6",
        className,
      )}
    >
      <p className="text-body-lg leading-relaxed text-text-primary">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-6 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-body font-medium text-accent">
          {initial}
        </div>
        <div>
          <p className="text-body text-text-primary">{name}</p>
          <p className="text-small text-text-muted">{role}</p>
        </div>
      </div>
    </div>
  );
}
