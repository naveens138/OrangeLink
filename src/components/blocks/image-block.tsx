import type { Block } from "@/lib/types";

export function ImageBlock({ block }: { block: Block }) {
  const config = block.config as { url?: string };
  if (!config.url) return null;

  // eslint-disable-next-line @next/next/no-img-element -- arbitrary creator-pasted URLs, not a configured remote pattern
  return <img src={config.url} alt="" className="w-full rounded-lg" />;
}
