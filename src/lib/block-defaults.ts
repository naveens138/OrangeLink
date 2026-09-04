import {
  Link2,
  Type,
  Image as ImageIcon,
  Package,
  Mail,
  AtSign,
  Code2,
  CalendarDays,
  Minus,
  type LucideIcon,
} from "lucide-react";
import type { BlockType } from "./types";

// "header" is excluded — it renders as the fixed identity area (see
// PublicPageView), not a block a creator adds/reorders.
export const addableBlockTypes: BlockType[] = [
  "link",
  "product",
  "text",
  "image",
  "email_capture",
  "social_icons",
  "embed",
  "booking",
  "divider",
];

export const blockTypeMeta: Record<
  BlockType,
  { label: string; icon: LucideIcon; defaultConfig: Record<string, unknown> }
> = {
  link: {
    label: "Link",
    icon: Link2,
    defaultConfig: { label: "New link", url: "https://" },
  },
  product: {
    label: "Product",
    icon: Package,
    defaultConfig: { product_id: "" },
  },
  text: {
    label: "Text",
    icon: Type,
    defaultConfig: { text: "Write something…" },
  },
  image: {
    label: "Image",
    icon: ImageIcon,
    defaultConfig: { url: "" },
  },
  email_capture: {
    label: "Email capture",
    icon: Mail,
    defaultConfig: { headline: "Join the list", cta_text: "Subscribe" },
  },
  social_icons: {
    label: "Social icons",
    icon: AtSign,
    defaultConfig: { platforms: [] },
  },
  embed: {
    label: "Embed",
    icon: Code2,
    defaultConfig: { platform: "youtube", embed_url: "" },
  },
  booking: {
    label: "Booking",
    icon: CalendarDays,
    defaultConfig: { provider: "calendly", url: "" },
  },
  divider: {
    label: "Divider",
    icon: Minus,
    defaultConfig: {},
  },
  header: {
    label: "Profile header",
    icon: Type,
    defaultConfig: {},
  },
};
