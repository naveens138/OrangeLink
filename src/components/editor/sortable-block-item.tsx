"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Trash2, Lock, Clock } from "lucide-react";
import { blockTypeMeta } from "@/lib/block-defaults";
import { cn } from "@/lib/utils";
import type { Block, Product } from "@/lib/types";

const PLATFORM_NAMES: Record<string, string> = {
  x: "X",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

function blockSummary(block: Block, products: Product[]): string {
  const config = block.config as Record<string, unknown>;
  switch (block.type) {
    case "link":
      return (config.label as string) || "Untitled link";
    case "text":
      return (config.text as string) || "Empty text block";
    case "email_capture":
      return (config.headline as string) || "Email capture";
    case "product": {
      const product = products.find((p) => p.id === config.product_id);
      return product?.name ?? "Choose a product";
    }
    case "social_icons": {
      const platforms = (config.platforms as string[] | undefined) ?? [];
      return platforms.length
        ? platforms.map((p) => PLATFORM_NAMES[p] ?? p).join(", ")
        : "No platforms added yet";
    }
    default:
      return blockTypeMeta[block.type].label;
  }
}

/**
 * One block in the editor list. Selecting it opens its settings (children)
 * inline underneath, so editing happens in place rather than in a separate
 * column.
 */
export function SortableBlockItem({
  block,
  products,
  selected,
  onSelect,
  onToggleVisible,
  onDelete,
  children,
}: {
  block: Block;
  products: Product[];
  selected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const meta = blockTypeMeta[block.type];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-md border bg-background transition-colors duration-[170ms]",
        selected
          ? "border-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.05)]"
          : "border-border hover:border-border-strong",
        isDragging && "relative z-10 opacity-70",
      )}
    >
      <div
        className={cn(
          "group flex items-center gap-2 px-2 py-2.5",
          !block.is_visible && "opacity-50",
        )}
      >
        <button
          type="button"
          aria-label="Drag to reorder"
          className="flex h-6 w-6 shrink-0 items-center justify-center text-text-muted opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <meta.icon className="h-4 w-4 shrink-0 text-text-secondary" />
          <div className="min-w-0">
            <p className="truncate text-small font-medium text-text-primary">
              {blockSummary(block, products)}
            </p>
            <p className="flex items-center gap-1.5 font-mono text-label uppercase tracking-[0.1em] text-text-muted">
              {meta.label}
              {block.is_password_protected && (
                <Lock className="h-3 w-3" aria-label="Password protected" />
              )}
              {(block.visible_from || block.visible_until) && (
                <Clock className="h-3 w-3" aria-label="Scheduled" />
              )}
            </p>
          </div>
        </button>

        <button
          type="button"
          aria-label={block.is_visible ? "Hide block" : "Show block"}
          onClick={onToggleVisible}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
        >
          {block.is_visible ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          aria-label="Delete block"
          onClick={onDelete}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {selected && children && (
        <div className="border-t border-border p-4">{children}</div>
      )}
    </div>
  );
}
