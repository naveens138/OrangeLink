import type { BlockType } from "@/lib/types";

/** A block extracted from a source page, before it becomes a real `blocks` row. */
export interface ParsedBlock {
  type: Extract<
    BlockType,
    "link" | "text" | "image" | "social_icons" | "embed"
  >;
  config: Record<string, unknown>;
  /** Why this block is questionable — surfaced for review, never auto-dropped. */
  warnings?: string[];
  /** Set by the AI pass when it rewrote the label; the original is kept so the creator can compare. */
  originalLabel?: string;
}

export interface ParsedProfile {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export type SourcePlatform =
  | "linktree"
  | "stan"
  | "beacons"
  | "lnkbio"
  | "campsite"
  | "milkshake"
  | "directme"
  | "shorby"
  | "koji"
  | "generic"
  | "manual_paste";

export interface ExtractionResult {
  platform: SourcePlatform;
  /** Which extraction path produced the blocks — shown in the review UI so a
   *  thin result is explainable rather than mysterious. */
  strategy: "embedded-json" | "json-ld" | "dom" | "manual" | "none";
  profile: ParsedProfile;
  blocks: ParsedBlock[];
  warnings: string[];
}

/** Domains that are the creator's own socials rather than content links. */
export const SOCIAL_DOMAINS: Record<string, string> = {
  "instagram.com": "instagram",
  "www.instagram.com": "instagram",
  "youtube.com": "youtube",
  "www.youtube.com": "youtube",
  "youtu.be": "youtube",
  "tiktok.com": "tiktok",
  "www.tiktok.com": "tiktok",
  "twitter.com": "twitter",
  "x.com": "twitter",
  "facebook.com": "facebook",
  "www.facebook.com": "facebook",
};
