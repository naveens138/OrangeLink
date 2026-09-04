import type { Block } from "@/lib/types";

export function TextBlock({ block }: { block: Block }) {
  const config = block.config as { text?: string };
  if (!config.text) return null;
  return <p className="text-body-lg leading-relaxed">{config.text}</p>;
}
