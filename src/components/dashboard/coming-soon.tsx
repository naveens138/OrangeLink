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
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border-strong px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-h3">{title}</h2>
      <p className="mt-2 max-w-sm text-body text-text-secondary">
        {description}
      </p>
      <p className="mt-4 font-mono text-label uppercase tracking-[0.1em] text-text-muted">
        {milestone}
      </p>
    </div>
  );
}
