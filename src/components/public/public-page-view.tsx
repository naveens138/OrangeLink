"use client";

import Link from "next/link";
import { useTheme } from "@/components/theme/theme-provider";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { PageTracker } from "@/components/analytics/page-tracker";
import { themePresets, type ThemePreset } from "@/lib/theme-presets";
import type { Creator, Page, Product } from "@/lib/types";

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

  const visibleBlocks = page.blocks
    .filter((b) => b.type !== "header")
    .sort((a, b) => a.position - b.position);

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

        <div className="flex w-full flex-col gap-3">
          {visibleBlocks.map((block) => (
            <BlockRenderer
              key={block.id}
              block={block}
              username={creator.username}
              products={products}
            />
          ))}
        </div>

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
