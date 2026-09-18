import type { Block, Product, UnlockCondition, UnlockedBlock } from "@/lib/types";
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
import { FollowUnlockGate } from "./follow-unlock-gate";

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

/**
 * Hidden and out-of-window blocks never get here: getPublicPage drops them
 * on the server. Locked blocks arrive as stubs with no content, and their
 * gates fetch the real block once they open.
 */
export function BlockRenderer({
  block,
  username,
  products,
}: {
  block: Block;
  username: string;
  products: Product[];
}) {
  // Decided by type alone, so it holds for a stub too.
  if (!renderContent(block, username, products)) return null;

  if (block.is_password_protected) {
    return (
      <PasswordGate blockId={block.id} username={username}>
        {(unlocked) => (
          <FollowGated
            block={unlocked.block}
            username={username}
            products={unlocked.products}
            revealed
          />
        )}
      </PasswordGate>
    );
  }

  return <FollowGated block={block} username={username} products={products} revealed={false} />;
}

// `revealed`: the block's full config is already here (a password gate
// fetched it), rather than the follow gate's stub.
function FollowGated({
  block,
  username,
  products,
  revealed,
}: {
  block: Block;
  username: string;
  products: Product[];
  revealed: boolean;
}) {
  const unlockCondition = (block.config as { unlock_condition?: UnlockCondition })
    .unlock_condition;
  if (!unlockCondition) return renderContent(block, username, products);

  return (
    <FollowUnlockGate condition={unlockCondition} blockId={block.id} username={username}>
      {revealed
        ? renderContent(block, username, products)
        : (unlocked: UnlockedBlock) => renderContent(unlocked.block, username, unlocked.products)}
    </FollowUnlockGate>
  );
}
