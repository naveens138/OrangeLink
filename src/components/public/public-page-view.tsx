"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Share } from "lucide-react";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { SocialIconsBlock } from "@/components/blocks/social-icons-block";
import { PageTracker } from "@/components/analytics/page-tracker";
import { ShareButton } from "@/components/public/share-button";
import { Modal } from "@/components/ui/modal";
import { DEFAULT_PRESET, isThemePreset, themePresets } from "@/lib/theme-presets";
import { customThemeStyle, normalizeCustomTheme } from "@/lib/theme-custom";
import { cn } from "@/lib/utils";
import type { Block, Creator, Page, Product } from "@/lib/types";

type Tab = "links" | "shop";

/**
 * The public creator page, in the shape of a Linktree profile: a frosted
 * card over a grainy gradient with the logo, Subscribe and Share across the
 * top, then photo, name, bio and social icons, a Links / Shop switch, and
 * links first with a large "See Full Shop" card leading into the products.
 *
 * On phones the card is the whole screen, as Linktree does it; from `sm` up
 * it floats with its top corners rounded and runs to the bottom of the page.
 *
 * Social icons and the email capture are lifted out of the block order
 * because they're page furniture rather than content: the icons sit under
 * the bio and the email capture opens from the Subscribe button. Everything
 * else keeps the creator's order.
 */
export function PublicPageView({
  creator,
  page,
  products,
  initialTab = "links",
}: {
  creator: Creator;
  page: Page;
  products: Product[];
  initialTab?: Tab;
}) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  const visibleBlocks = page.blocks
    .filter((b) => b.type !== "header")
    .sort((a, b) => a.position - b.position);

  const socialBlock = visibleBlocks.find((b) => b.type === "social_icons");
  const emailBlock = visibleBlocks.find((b) => b.type === "email_capture");
  const body = visibleBlocks.filter(
    (b) => b.type !== "social_icons" && b.type !== "email_capture",
  );

  const productBlocks = body.filter((b) => b.type === "product");
  const linkBlocks = body.filter((b) => b.type !== "product");
  const hasShop = productBlocks.length > 0;
  const hasLinks = linkBlocks.length > 0;
  // The creator's choices from the dashboard's Page theme popup. Tabs are on
  // unless turned off, and only mean anything when there are both links
  // and products; otherwise the page is one scroll either way.
  const tabbed = page.theme?.tabbed_view ?? true;
  const canTab = tabbed && hasShop && hasLinks;
  const preset = isThemePreset(page.theme?.preset) ? page.theme.preset : DEFAULT_PRESET;
  // An AI design, if the creator has one, overrides the preset. Re-checked
  // here rather than trusted from the database, since it feeds a style
  // attribute.
  const custom = normalizeCustomTheme(page.theme?.custom);
  const look = custom
    ? customThemeStyle(custom)
    : {
        style: { "--storefront-gradient": themePresets[preset].gradient } as React.CSSProperties,
        buttons: "solid" as const,
      };

  const shopProducts = productBlocks
    .map((b) => products.find((p) => p.id === (b.config as { product_id?: string }).product_id))
    .filter((p): p is Product => Boolean(p));

  const displayName = creator.display_name ?? creator.username;
  const initial = displayName.charAt(0).toUpperCase();

  function render(blocks: Block[]) {
    return blocks.map((block) => (
      <BlockRenderer
        key={block.id}
        block={block}
        username={creator.username}
        products={products}
      />
    ));
  }

  const shopGrid = (
    <div className="grid grid-cols-2 gap-3">
      {productBlocks.map((block, i) =>
        // An odd last product takes the full row, as in the reference,
        // instead of leaving a hole beside it.
        productBlocks.length % 2 === 1 && i === productBlocks.length - 1 ? (
          <div key={block.id} data-wide className="col-span-2">
            {render([block])}
          </div>
        ) : (
          <div key={block.id}>{render([block])}</div>
        ),
      )}
    </div>
  );

  // withDoorway: the "See Full Shop" card leading into the Shop tab. Only
  // in tabbed mode; in one scroll the shop is simply further down.
  function linkList(withDoorway: boolean) {
    return (
      <div className="flex flex-col gap-3">
        {withDoorway && (
          <button
            type="button"
            onClick={() => setActiveTab("shop")}
            className="storefront-pill w-full overflow-hidden rounded-[calc(var(--card-radius)_+_4px)] p-3 pb-4"
          >
            {/* Fixed-width tiles rather than flex-1, so the third runs off
                the edge the way the reference's does and the strip reads as
                "there's more in here". The strip's own grey shows through the
                gaps as hairline dividers. */}
            <div className="flex gap-[3px] overflow-hidden rounded-[calc(var(--card-radius)_-_4px)] bg-[#e9e7e3]">
              {shopProducts.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="aspect-[3/5] w-[38%] shrink-0 bg-white bg-cover bg-center"
                  style={p.cover_image_url ? { backgroundImage: `url(${p.cover_image_url})` } : undefined}
                />
              ))}
            </div>
            <p className="mt-3 text-[14px] font-semibold">See Full Shop</p>
            <p className="text-[13px] text-text-secondary">
              {shopProducts.length} product{shopProducts.length === 1 ? "" : "s"}
            </p>
          </button>
        )}
        {render(linkBlocks)}
      </div>
    );
  }

  // Frosted, like the card: the ground shows through.
  const glassButton =
    "flex h-10 items-center justify-center rounded-full bg-white/70 text-text-primary shadow-[0_0_0_1px_rgba(0,0,0,0.06)] backdrop-blur-md transition-[background-color,transform] duration-200 hover:scale-[1.04] hover:bg-white";

  return (
    <div
      className="theme-storefront storefront-ground min-h-screen text-text-primary sm:px-6 sm:pt-12"
      style={look.style}
      data-buttons={look.buttons}
    >
      <PageTracker username={creator.username} pageId={page.id} />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[720px] flex-col px-5 pb-10 pt-5 sm:min-h-[calc(100vh-3rem)] sm:rounded-t-[36px] sm:bg-[var(--card)] sm:px-9 sm:pt-9 sm:shadow-[0_0_0_1px_rgba(255,255,255,0.7)] sm:backdrop-blur-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="OrangeLink" className={cn(glassButton, "w-10")}>
            <Image src="/logo-orange.png" alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            {emailBlock && (
              <button
                type="button"
                onClick={() => setSubscribeOpen(true)}
                className={cn(glassButton, "px-4 text-[14px] font-semibold")}
              >
                Subscribe
              </button>
            )}
            <ShareButton
              url={`/${creator.username}`}
              title={displayName}
              label="Share this page"
              className={cn(glassButton, "w-10")}
            >
              <Share className="h-[18px] w-[18px]" />
            </ShareButton>
          </div>
        </div>

        {/* Profile */}
        <div className="mt-7 flex flex-col items-center text-center">
          <div className="flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full bg-surface-3 text-[36px] font-semibold shadow-[0_0_0_4px_rgba(255,255,255,0.8)]">
            {creator.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <h1 className="mt-4 text-[28px] font-bold leading-tight tracking-[-0.01em]">{displayName}</h1>
          {creator.bio && (
            <p className="mt-1 max-w-[40ch] text-[16px] font-semibold leading-snug text-text-primary/80">
              {creator.bio}
            </p>
          )}
          {socialBlock && (
            <div className="mt-5">
              <SocialIconsBlock block={socialBlock} />
            </div>
          )}
        </div>

        {/* Links / Shop */}
        {canTab && (
          <div className="mt-6 flex justify-center">
            <div className="flex items-center rounded-full bg-black/[0.05] p-1">
              {(["links", "shop"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "rounded-full px-6 py-2 text-[14px] font-semibold transition-colors duration-200",
                    activeTab === tab
                      ? "bg-[var(--storefront-accent)] text-white"
                      : "text-text-primary hover:text-text-secondary",
                  )}
                >
                  {tab === "links" ? "Links" : "Shop"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 flex-1">
          {canTab ? (
            activeTab === "shop" ? shopGrid : linkList(true)
          ) : (
            // One scroll: links first, then the shop under its own heading.
            <div className="flex flex-col gap-10">
              {hasLinks && linkList(false)}
              {hasShop && (
                <section>
                  {hasLinks && <p className="mb-4 text-center text-[14px] font-semibold">Shop</p>}
                  {shopGrid}
                </section>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 flex flex-col items-center gap-6">
          <Link
            href="/signup"
            className="rounded-full bg-text-primary px-5 py-3 text-[14px] font-semibold text-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-transform duration-200 hover:scale-[1.03]"
          >
            Get your own OrangeLink
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] font-medium text-text-primary/75">
            <Link href="/privacy" className="hover:text-text-primary">Privacy</Link>
            <span aria-hidden>·</span>
            <Link href="/terms" className="hover:text-text-primary">Terms</Link>
            <span aria-hidden>·</span>
            <Link href="/contact" className="hover:text-text-primary">Report</Link>
            <span aria-hidden>·</span>
            <Link href="/" className="hover:text-text-primary">More from OrangeLink</Link>
          </nav>
        </div>
      </div>

      {emailBlock && (
        <Modal
          open={subscribeOpen}
          onClose={() => setSubscribeOpen(false)}
          title={`Subscribe to ${displayName}`}
          maxWidthClassName="max-w-[440px]"
        >
          {/* The modal portals to <body>, outside this page's theme scope,
              so the theme is re-applied around its contents. */}
          <div className="theme-storefront">
            <BlockRenderer block={emailBlock} username={creator.username} products={products} />
          </div>
        </Modal>
      )}
    </div>
  );
}
