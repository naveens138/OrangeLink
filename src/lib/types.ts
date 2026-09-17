// Mirrors schema.sql — trimmed to the fields the MVP UI actually reads.

export type BlockType =
  | "link"
  | "product"
  | "embed"
  | "email_capture"
  | "text"
  | "image"
  | "booking"
  | "social_icons"
  | "divider"
  | "header";

export interface Block {
  id: string;
  type: BlockType;
  position: number;
  is_visible: boolean;
  visible_from: string | null;
  visible_until: string | null;
  is_password_protected: boolean;
  config: Record<string, unknown>;
}

export type ProductType =
  | "digital_file"
  | "course"
  | "booking"
  | "coaching"
  | "membership";

export interface Product {
  id: string;
  type: ProductType;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  cover_image_url: string | null;
  /** Storage path (not a public URL) for a digital_file product — see src/lib/storage/product-files.ts */
  file_url: string | null;
  is_published: boolean;
  dodo_product_id: string | null;
}

export interface EmailSubscriber {
  id: string;
  email: string;
  source: string | null;
  tags: string[];
  subscribed_at: string;
  unsubscribed_at: string | null;
}

export type EspProviderName = "convertkit" | "beehiiv" | "mailerlite";

export interface EspIntegration {
  id: string;
  provider: EspProviderName;
  list_id: string | null;
  sync_enabled: boolean;
  connected_at: string;
}

export interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

import type { CustomTheme } from "./theme-custom";

export interface Page {
  id: string;
  creator_id: string;
  slug: string;
  title: string | null;
  theme: {
    preset?: "minimal" | "warm" | "soft" | "creator";
    /** Links/Shop tabs (only shown when both block types are present) vs one continuous scroll. Creator's choice. */
    tabbed_view?: boolean;
    /** A gallery template id (lib/page-templates.ts). Overrides the preset while set. */
    template?: string | null;
    /** An AI-made design (lib/theme-custom.ts). Overrides the template and preset while set. */
    custom?: CustomTheme | null;
  };
  published: boolean;
  blocks: Block[];
}

export type UnlockConditionType = "follow_instagram" | "follow_tiktok";

export interface UnlockCondition {
  type: UnlockConditionType;
  /** The creator's specific profile URL to open — not looked up from a social_icons block, so this works standalone. */
  url: string;
  /** Optional CTA text override; defaults to "Follow to unlock". */
  label?: string;
}

export interface LinkBlockConfig {
  url?: string;
  label?: string;
  /** Auto-fetched via the Milestone 3 import extractor when a creator pastes a URL, or set by hand. */
  image?: string;
  description?: string;
  /** Short overlay string, e.g. a discount code. */
  badge?: string;
}

export type TrackingPixelProvider = "meta_pixel" | "ga4" | "tiktok_pixel";

export interface TrackingPixel {
  id: string;
  provider: TrackingPixelProvider;
  pixel_id: string;
  created_at: string;
}
