import { track } from "@/lib/analytics/client";
import type { Block } from "@/lib/types";

export function LinkBlock({ block, username }: { block: Block; username: string }) {
  const config = block.config as { url?: string; label?: string };

  return (
    <a
      href={config.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track({ username, eventType: "block_click", blockId: block.id })}
      className="flex h-14 w-full items-center justify-center rounded-pill border border-current/15 px-6 text-body font-medium transition-transform duration-[170ms] hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {config.label ?? "Untitled link"}
    </a>
  );
}
