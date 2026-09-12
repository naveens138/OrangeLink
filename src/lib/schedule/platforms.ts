// The platforms the post planner knows about, with what each one allows.
//
// OrangeLink doesn't post to these itself yet (that needs each platform's API
// approval). "Post now" copies the caption and opens the platform instead.
// Some accept the text in the URL so the post arrives pre-filled; the rest
// open their upload screen and the creator pastes from the clipboard.

export const PLATFORMS = ["instagram", "tiktok", "youtube", "x", "threads", "facebook", "linkedin"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_META: Record<
  Platform,
  { label: string; limit: number; compose: (text: string, link: string | null) => string; prefills: boolean }
> = {
  instagram: {
    label: "Instagram",
    limit: 2200,
    compose: () => "https://www.instagram.com/",
    prefills: false,
  },
  tiktok: {
    label: "TikTok",
    limit: 2200,
    compose: () => "https://www.tiktok.com/upload",
    prefills: false,
  },
  youtube: {
    label: "YouTube",
    limit: 5000,
    compose: () => "https://studio.youtube.com/",
    prefills: false,
  },
  x: {
    label: "X",
    limit: 280,
    compose: (text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
    prefills: true,
  },
  threads: {
    label: "Threads",
    limit: 500,
    compose: (text) => `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`,
    prefills: true,
  },
  facebook: {
    label: "Facebook",
    limit: 5000,
    // Facebook's share dialog takes a link, not text.
    compose: (_text, link) =>
      link ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}` : "https://www.facebook.com/",
    prefills: false,
  },
  linkedin: {
    label: "LinkedIn",
    limit: 3000,
    compose: (text) => `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`,
    prefills: true,
  },
};

export function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && (PLATFORMS as readonly string[]).includes(value);
}

/** The text that goes out: caption, then the link on its own line. */
export function postText(caption: string, link: string | null): string {
  return link ? `${caption.trim()}\n\n${link}`.trim() : caption.trim();
}
