import type { ReactElement } from "react";
import type { Block } from "@/lib/types";

// lucide-react dropped brand/social marks — small inline outlines instead of
// pulling in a full brand-icon package for three glyphs.
const icons: Record<string, (props: { className?: string }) => ReactElement> = {
  instagram: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  youtube: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
      <path d="M10.5 9.2v5.6l5-2.8-5-2.8Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  tiktok: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M14 4v10.2a3.3 3.3 0 1 1-3.3-3.3" />
      <path d="M14 4c.5 2.4 2.2 4 4.6 4.3" />
    </svg>
  ),
};

export function SocialIconsBlock({ block }: { block: Block }) {
  const config = block.config as { platforms?: string[] };
  const platforms = config.platforms ?? [];

  return (
    <div className="flex items-center justify-center gap-4">
      {platforms.map((platform) => {
        const Icon = icons[platform];
        if (!Icon) return null;
        return (
          <a
            key={platform}
            href="#"
            aria-label={platform}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-current/15 transition-transform hover:-translate-y-0.5"
          >
            <Icon className="h-4 w-4" />
          </a>
        );
      })}
    </div>
  );
}
