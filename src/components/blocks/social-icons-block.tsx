import type { Block } from "@/lib/types";
import { PLATFORM_ICONS } from "@/components/brand/platform-icons";

const icons = PLATFORM_ICONS;

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
