import { requireCreator } from "@/lib/queries/dashboard";
import { TemplateGallery, type TemplateSample } from "@/components/templates/template-gallery";
import type { LinkBlockConfig } from "@/lib/types";

// Stand-ins for a page that doesn't have enough of its own yet, so every
// card still shows a full page.
const SAMPLE_LINKS = ["My latest video", "Shop my presets", "Book a 1:1 call", "Join the newsletter"];
const SAMPLE_SOCIALS = ["tiktok", "youtube", "x", "instagram"];

export default async function TemplatesPage() {
  const { creator, page } = await requireCreator();

  const blocks = page.blocks.filter((b) => b.is_visible).sort((a, b) => a.position - b.position);
  const ownLinks = blocks
    .filter((b) => b.type === "link")
    .map((b) => (b.config as LinkBlockConfig).label?.trim())
    .filter((label): label is string => Boolean(label))
    .slice(0, 4);
  const socialBlock = blocks.find((b) => b.type === "social_icons");
  const ownSocials = ((socialBlock?.config as { platforms?: string[] } | undefined)?.platforms ?? []).slice(0, 4);

  const sample: TemplateSample = {
    name: creator.display_name ?? creator.username,
    bio: creator.bio,
    avatar: creator.avatar_url,
    links: [...ownLinks, ...SAMPLE_LINKS].slice(0, 4),
    socials: ownSocials.length ? ownSocials : SAMPLE_SOCIALS,
  };

  return (
    <TemplateGallery
      pageId={page.id}
      username={creator.username}
      current={page.theme.template ?? null}
      hasCustomDesign={Boolean(page.theme.custom)}
      sample={sample}
    />
  );
}
