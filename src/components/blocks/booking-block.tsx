import { CalendarDays } from "lucide-react";
import type { Block } from "@/lib/types";

export function BookingBlock({ block }: { block: Block }) {
  const config = block.config as { url?: string };
  if (!config.url) return null;

  return (
    <a
      href={config.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-14 w-full items-center justify-center gap-2 rounded-pill border border-current/15 px-6 text-body font-medium transition-transform duration-[170ms] hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <CalendarDays className="h-4 w-4" />
      Book a time
    </a>
  );
}
