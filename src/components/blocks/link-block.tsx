import { track } from "@/lib/analytics/client";
import type { Block, LinkBlockConfig } from "@/lib/types";

export function LinkBlock({ block, username }: { block: Block; username: string }) {
  const config = block.config as LinkBlockConfig;

  function onClick() {
    track({ username, eventType: "block_click", blockId: block.id });
  }

  // Rich card once a preview image exists (auto-fetched or set by hand) —
  // plain pill button otherwise, so an ordinary link doesn't suddenly grow
  // an empty thumbnail slot.
  if (config.image) {
    return (
      <a
        href={config.url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="relative flex w-full items-center gap-4 rounded-lg border border-current/15 p-3 transition-transform duration-[170ms] hover:-translate-y-0.5 active:scale-[0.98]"
      >
        <div
          className="h-16 w-16 shrink-0 rounded-md bg-current/10 bg-cover bg-center"
          style={{ backgroundImage: `url(${config.image})` }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium">{config.label ?? "Untitled link"}</p>
          {config.description && (
            <p className="truncate text-small opacity-60">{config.description}</p>
          )}
        </div>
        {config.badge && (
          <span className="absolute -top-2 right-3 rounded-pill bg-accent px-2.5 py-0.5 text-label font-medium uppercase tracking-wide text-white">
            {config.badge}
          </span>
        )}
      </a>
    );
  }

  return (
    <a
      href={config.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="relative flex h-14 w-full items-center justify-center rounded-pill border border-current/15 px-6 text-body font-medium transition-transform duration-[170ms] hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {config.label ?? "Untitled link"}
      {config.badge && (
        <span className="absolute -top-2 right-3 rounded-pill bg-accent px-2.5 py-0.5 text-label font-medium uppercase tracking-wide text-white">
          {config.badge}
        </span>
      )}
    </a>
  );
}
