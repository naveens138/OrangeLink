import type { Block, Product } from "@/lib/types";
import { LinkBlock } from "./link-block";
import { ProductBlock } from "./product-block";
import { EmailCaptureBlock } from "./email-capture-block";
import { SocialIconsBlock } from "./social-icons-block";
import { DividerBlock } from "./divider-block";
import { TextBlock } from "./text-block";
import { ImageBlock } from "./image-block";
import { EmbedBlock } from "./embed-block";
import { BookingBlock } from "./booking-block";
import { PasswordGate } from "./password-gate";

function isWithinSchedule(block: Block, now: Date): boolean {
  if (block.visible_from && now < new Date(block.visible_from)) return false;
  if (block.visible_until && now > new Date(block.visible_until)) return false;
  return true;
}

function renderContent(block: Block, username: string, products: Product[]) {
  switch (block.type) {
    case "link":
      return <LinkBlock block={block} username={username} />;
    case "product":
      return (
        <ProductBlock block={block} username={username} products={products} />
      );
    case "email_capture":
      return <EmailCaptureBlock block={block} username={username} />;
    case "social_icons":
      return <SocialIconsBlock block={block} />;
    case "divider":
      return <DividerBlock />;
    case "text":
      return <TextBlock block={block} />;
    case "image":
      return <ImageBlock block={block} />;
    case "embed":
      return <EmbedBlock block={block} />;
    case "booking":
      return <BookingBlock block={block} />;
    // "header" is rendered separately by the page identity area.
    default:
      return null;
  }
}

export function BlockRenderer({
  block,
  username,
  products,
}: {
  block: Block;
  username: string;
  products: Product[];
}) {
  if (!block.is_visible) return null;
  if (!isWithinSchedule(block, new Date())) return null;

  const content = renderContent(block, username, products);
  if (!content) return null;

  if (block.is_password_protected) {
    return <PasswordGate blockId={block.id}>{content}</PasswordGate>;
  }

  return content;
}
