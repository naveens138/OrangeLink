import type { Block } from "@/lib/types";

export function EmbedBlock({ block }: { block: Block }) {
  const config = block.config as { embed_url?: string };
  if (!config.embed_url) return null;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-current/15">
      <iframe
        src={config.embed_url}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
