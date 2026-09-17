import type { TemplateSample } from "@/components/templates/template-gallery";
import type { Block, Creator, LinkBlockConfig } from "@/lib/types";

// Stand-ins for a page that doesn't have enough of its own yet, so every
// template card still shows a full page.
const SAMPLE_LINKS = ["My latest video", "Shop my presets", "Book a 1:1 call", "Join the newsletter"];
const SAMPLE_SOCIALS = ["tiktok", "youtube", "x", "instagram"];

/** The creator's own name, photo, bio, first links and socials, for the template cards. */
export function buildTemplateSample(creator: Creator, blocks: Block[]): TemplateSample {
  const visible = blocks.filter((b) => b.is_visible).sort((a, b) => a.position - b.position);
  const ownLinks = visible
    .filter((b) => b.type === "link")
    .map((b) => (b.config as LinkBlockConfig).label?.trim())
    .filter((label): label is string => Boolean(label))
    .slice(0, 4);
  const socialBlock = visible.find((b) => b.type === "social_icons");
  const ownSocials = ((socialBlock?.config as { platforms?: string[] } | undefined)?.platforms ?? []).slice(0, 4);

  return {
    name: creator.display_name ?? creator.username,
    bio: creator.bio,
    avatar: creator.avatar_url,
    links: [...ownLinks, ...SAMPLE_LINKS].slice(0, 4),
    socials: ownSocials.length ? ownSocials : SAMPLE_SOCIALS,
  };
}
