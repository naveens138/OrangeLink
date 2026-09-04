import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  description,
  milestone,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  milestone: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-h3">{title}</h2>
      <p className="mt-2 max-w-sm text-body text-text-secondary">
        {description}
      </p>
      <p className="mt-4 text-label uppercase tracking-wide text-text-muted">
        {milestone}
      </p>
    </div>
  );
}
