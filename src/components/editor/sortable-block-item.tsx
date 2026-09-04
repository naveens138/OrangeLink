"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Trash2, Lock, Clock } from "lucide-react";
import { blockTypeMeta } from "@/lib/block-defaults";
import { cn } from "@/lib/utils";
import type { Block } from "@/lib/types";

function blockSummary(block: Block): string {
  const config = block.config as Record<string, unknown>;
  switch (block.type) {
    case "link":
      return (config.label as string) || "Untitled link";
    case "text":
      return (config.text as string) || "Empty text block";
    case "email_capture":
      return (config.headline as string) || "Email capture";
    case "product":
      return config.product_id ? "Product" : "No product selected";
    case "social_icons":
      return `${(config.platforms as string[] | undefined)?.length ?? 0} platform(s)`;
    default:
      return blockTypeMeta[block.type].label;
  }
}

export function SortableBlockItem({
  block,
  selected,
  onSelect,
  onToggleVisible,
  onDelete,
}: {
  block: Block;
  selected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const meta = blockTypeMeta[block.type];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-2 rounded-md border bg-surface-1 px-2 py-2.5 transition-colors duration-[170ms]",
        selected ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong",
        isDragging && "opacity-50",
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
          <p className="truncate text-small text-text-primary">
            {blockSummary(block)}
          </p>
          <p className="flex items-center gap-1.5 text-label uppercase tracking-wide text-text-muted">
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
  );
}
