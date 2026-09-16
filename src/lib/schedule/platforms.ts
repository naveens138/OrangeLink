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

/** The public profile page for a handle on each platform. */
export const PROFILE_URL: Record<Platform, (handle: string) => string> = {
  instagram: (h) => `https://www.instagram.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  x: (h) => `https://x.com/${h}`,
  threads: (h) => `https://www.threads.net/@${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
  linkedin: (h) => `https://www.linkedin.com/in/${h}`,
};

const HANDLE_RE = /^[A-Za-z0-9._-]{1,60}$/;

/**
 * "@jane", "jane" or a pasted profile link ("https://www.tiktok.com/@jane",
 * "linkedin.com/in/jane/") all become "jane". Null if it isn't a handle.
 */
export function parseHandle(input: string): string | null {
  let value = input.trim();
  // Looks like a link: take the handle from its path.
  // (A dot alone doesn't count: "jane.rides" is a normal Instagram handle.)
  if (value.includes("/") || /^(www\.)?(instagram|tiktok|youtube|x|twitter|threads|facebook|linkedin)\.(com|net)$/i.test(value)) {
    const path = value.replace(/^[a-z]+:\/\//i, "").split(/[?#]/)[0].split("/").slice(1).filter(Boolean);
    const skip = new Set(["in", "c", "channel", "user", "company"]);
    value = [...path].reverse().find((seg) => !skip.has(seg.toLowerCase())) ?? "";
  }
  value = value.replace(/^@/, "");
  return HANDLE_RE.test(value) ? value : null;
}
