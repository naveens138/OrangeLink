import type { ReactElement } from "react";
import type { Block } from "@/lib/types";

// lucide-react dropped brand marks, so these are small inline outlines
// rather than pulling in a whole brand-icon package for a handful of glyphs.
const icons: Record<string, (props: { className?: string }) => ReactElement> = {
  x: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.53 3h3.02l-6.6 7.54L21.75 21h-5.86l-4.6-6-5.26 6H3l7.06-8.07L2.5 3h6l4.16 5.5L17.53 3Zm-1.06 16.2h1.67L7.62 4.72H5.83l10.64 14.48Z" />
    </svg>
  ),
  instagram: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  tiktok: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M14 4v10.2a3.3 3.3 0 1 1-3.3-3.3" />
      <path d="M14 4c.5 2.4 2.2 4 4.6 4.3" />
    </svg>
  ),
  youtube: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
      <path d="M10.5 9.2v5.6l5-2.8-5-2.8Z" fill="currentColor" stroke="none" />
    </svg>
  ),
};

interface SocialConfig {
  platforms?: string[];
  /** Per-platform destination, e.g. { instagram: "https://instagram.com/me" }. */
  links?: Record<string, string>;
}

const LABELS: Record<string, string> = {
  x: "X",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

/**
 * Socials as a row of bare icons under the bio, the way the reference
 * shows them. The platform name stays in aria-label so screen readers get
 * "Instagram" rather than an unlabelled graphic.
 */
export function SocialIconsBlock({ block }: { block: Block }) {
  const config = block.config as SocialConfig;
  const platforms = config.platforms ?? [];

  return (
    <div className="flex items-center justify-center gap-5">
      {platforms.map((platform) => {
        const Icon = icons[platform];
        if (!Icon) return null;

        const label = LABELS[platform] ?? platform;
        const href = config.links?.[platform]?.trim();

        // An icon with nowhere to go is worse than none: it looks clickable
        // and does nothing. Without a URL it renders as a plain mark.
        if (!href) {
          return (
            <span key={platform} aria-label={label} className="text-text-primary">
              <Icon className="h-7 w-7" />
            </span>
          );
        }

        return (
          <a
            key={platform}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="text-text-primary transition-transform duration-200 hover:scale-110"
          >
            <Icon className="h-7 w-7" />
          </a>
        );
      })}
    </div>
  );
}
