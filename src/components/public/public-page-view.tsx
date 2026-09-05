"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/theme/theme-provider";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { PageTracker } from "@/components/analytics/page-tracker";
import { cn } from "@/lib/utils";
import { themePresets, type ThemePreset } from "@/lib/theme-presets";
import type { Block, Creator, Page, Product } from "@/lib/types";

type Tab = "links" | "shop";

export function PublicPageView({
  creator,
  page,
  products,
}: {
  creator: Creator;
  page: Page;
  products: Product[];
}) {
  const { resolvedTheme } = useTheme();
  const preset: ThemePreset = page.theme.preset ?? "minimal";
  const colors = themePresets[preset][resolvedTheme];
  const [activeTab, setActiveTab] = useState<Tab>("links");

  const visibleBlocks = page.blocks
    .filter((b) => b.type !== "header")
    .sort((a, b) => a.position - b.position);

  const productBlocks = visibleBlocks.filter((b) => b.type === "product");
  // "Shop" is specifically the product grid; every other block type (links,
  // text, email capture, embeds, ...) reads naturally as one combined
  // "Links" tab rather than inventing a third bucket the creator never asked
  // for — same split linktr.ee/mojobike use.
  const linkBlocks = visibleBlocks.filter((b) => b.type !== "product");

  const canTab = page.theme.tabbed_view && productBlocks.length > 0 && linkBlocks.length > 0;

  function renderBlockList(blocks: Block[]) {
    return blocks.map((block) => (
      <BlockRenderer
        key={block.id}
        block={block}
        username={creator.username}
        products={products}
      />
    ));
  }

  return (
    <div
      className="flex min-h-screen justify-center px-4 py-16 md:px-6"
      style={{ background: colors.bg, color: colors.fg }}
    >
      <PageTracker username={creator.username} pageId={page.id} />
      <div className="flex w-full max-w-[680px] flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-current/10 text-h3 font-semibold">
            {creator.display_name?.[0] ?? creator.username[0]}
          </div>
          <h1 className="text-h2">{creator.display_name ?? creator.username}</h1>
          {creator.bio && (
            <p className="max-w-md text-body opacity-70">{creator.bio}</p>
          )}
        </div>

        {canTab ? (
          <>
            <div className="flex items-center gap-1 rounded-pill border border-current/15 p-1">
              {(["links", "shop"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "rounded-pill px-5 py-2 text-small font-medium capitalize transition-colors duration-[170ms]",
                    activeTab === tab
                      ? "bg-current/10 text-current"
                      : "opacity-60 hover:opacity-100",
                  )}
                >
                  {tab === "links" ? "Links" : "Shop"}
                </button>
              ))}
            </div>

            {activeTab === "links" ? (
              <div className="flex w-full flex-col gap-3">{renderBlockList(linkBlocks)}</div>
            ) : (
              <div className="grid w-full grid-cols-2 gap-3">{renderBlockList(productBlocks)}</div>
            )}
          </>
        ) : (
          <div className="flex w-full flex-col gap-3">{renderBlockList(visibleBlocks)}</div>
        )}

        <Link
          href="/"
          className="mt-6 text-small opacity-40 transition-opacity hover:opacity-70"
        >
          Powered by OrangeLink
        </Link>
      </div>
    </div>
  );
}
