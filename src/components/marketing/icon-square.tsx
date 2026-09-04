import type { LucideIcon } from "lucide-react";

export function IconSquare({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hover text-white">
      <Icon className="h-5 w-5" />
    </div>
  );
}
