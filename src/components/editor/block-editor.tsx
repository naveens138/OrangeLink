"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Plus, Layers, SlidersHorizontal, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { BlockLibrary } from "@/components/editor/block-library";
import { SortableBlockItem } from "@/components/editor/sortable-block-item";
import { BlockInspector } from "@/components/editor/block-inspector";
import { ThemePresetPicker } from "@/components/editor/theme-preset-picker";
import { AiThemeDesigner } from "@/components/editor/ai-theme-designer";
import { blockTypeMeta } from "@/lib/block-defaults";
import type { Block, BlockType, Product } from "@/lib/types";
import type { ThemePreset } from "@/lib/theme-presets";
import type { CustomTheme } from "@/lib/theme-custom";
import {
  createBlock,
  deleteBlock,
  reorderBlocks,
  updateBlock,
  updatePageTheme,
  type ActionResult,
} from "@/app/(dashboard)/dashboard/links/actions";

type SaveState = "saved" | "saving" | "error";

export function BlockEditor({
  pageId,
  username,
  initialBlocks,
  initialPreset,
  initialTabbedView,
  initialCustom,
  products,
}: {
  pageId: string;
  username: string;
  initialBlocks: Block[];
  initialPreset: ThemePreset;
  initialTabbedView: boolean;
  initialCustom: CustomTheme | null;
  products: Product[];
}) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [themePreset, setThemePreset] = useState<ThemePreset>(initialPreset);
  const [tabbedView, setTabbedView] = useState<boolean>(initialTabbedView);
  const [customTheme, setCustomTheme] = useState<CustomTheme | null>(initialCustom);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialBlocks[0]?.id ?? null,
  );
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  /**
   * Runs a server action and reflects its outcome in the save indicator.
   * `revert` restores the pre-edit state when the write fails, so the canvas
   * never shows a change the database rejected.
   */
  function persist<T>(
    run: () => Promise<ActionResult<T>>,
    options: { revert?: () => void; onSuccess?: (data: T) => void } = {},
  ) {
    setSaveState("saving");
    setErrorMessage(null);
    startTransition(async () => {
      const result = await run();
      if (result.ok) {
        options.onSuccess?.(result.data);
        setSaveState("saved");
      } else {
        options.revert?.();
        setSaveState("error");
        setErrorMessage(result.error);
      }
    });
  }

  function addBlock(type: BlockType) {
    setLibraryOpen(false);
    const position = blocks.length;
    const config = { ...blockTypeMeta[type].defaultConfig };
    // The row is appended only once the insert succeeds, so the canvas shows
    // the database's real uuid rather than a temporary one it would have to
    // reconcile later.
    persist(() => createBlock(pageId, type, position, config), {
      onSuccess: (block) => {
        setBlocks((prev) => [...prev, block]);
        setSelectedId(block.id);
      },
    });
  }

  function applyBlockUpdate(id: string, updates: Partial<Block> & { password?: string | null }) {
    const previous = blocks;
    const { password, ...local } = updates;
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...local } : b)),
    );
    persist(
      () =>
        updateBlock(id, {
          config: updates.config,
          is_visible: updates.is_visible,
          visible_from: updates.visible_from,
          visible_until: updates.visible_until,
          is_password_protected: updates.is_password_protected,
          password,
        }),
      { revert: () => setBlocks(previous) },
    );
  }

  function toggleVisible(id: string) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    applyBlockUpdate(id, { is_visible: !block.is_visible });
  }

  function removeBlock(id: string) {
    const previous = blocks;
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
    persist(() => deleteBlock(id), { revert: () => setBlocks(previous) });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previous = blocks;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    const next = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({
      ...b,
      position: i,
    }));
    setBlocks(next);

    persist(
      () =>
        reorderBlocks(
          pageId,
          next.map((b) => b.id),
        ),
      { revert: () => setBlocks(previous) },
    );
  }

  // Picking a preset also clears an AI design, which otherwise overrides it.
  function changeTheme(preset: ThemePreset) {
    const previous = { preset: themePreset, custom: customTheme };
    setThemePreset(preset);
    setCustomTheme(null);
    persist(() => updatePageTheme(pageId, { preset, custom: null }), {
      revert: () => {
        setThemePreset(previous.preset);
        setCustomTheme(previous.custom);
      },
    });
  }

  function changeTabbedView(next: boolean) {
    const previous = tabbedView;
    setTabbedView(next);
    persist(() => updatePageTheme(pageId, { tabbed_view: next }), {
      revert: () => setTabbedView(previous),
    });
  }

  // The AI action has already saved the design; this just shows it.
  function applyAiDesign(theme: CustomTheme, nextTabbedView?: boolean) {
    setCustomTheme(theme);
    if (nextTabbedView !== undefined) setTabbedView(nextTabbedView);
  }

  const statusLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "error"
        ? (errorMessage ?? "Couldn't save")
        : "All changes saved";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2">Links</h1>
          <p
            className={
              saveState === "error"
                ? "mt-1 text-body text-danger"
                : "mt-1 text-body text-text-secondary"
            }
          >
            {statusLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setThemeOpen(true)}>
            <Palette className="h-4 w-4" />
            Theme
          </Button>
          <Link href={`/${username}`} target="_blank">
            <Button variant="secondary" size="sm">
              Preview
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Block library — desktop only */}
        <div className="hidden w-[240px] shrink-0 lg:block">
          <p className="mb-3 font-mono text-label uppercase tracking-[0.1em] text-text-muted">
            Add a block
          </p>
          <BlockLibrary onAdd={addBlock} />
        </div>

        {/* Canvas */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 lg:hidden">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLibraryOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add block
            </Button>
          </div>

          <DndContext
            // Without a stable id, dnd-kit derives its own on each render and
            // the server/client aria-describedby values disagree, which React
            // reports as a hydration mismatch.
            id="block-editor"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {blocks.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
                    <Layers className="h-6 w-6 text-text-muted" />
                    <p className="mt-3 text-body text-text-secondary">
                      No blocks yet. Add one to get started.
                    </p>
                  </div>
                )}
                {blocks.map((block) => (
                  <SortableBlockItem
                    key={block.id}
                    block={block}
                    selected={block.id === selectedId}
                    onSelect={() => setSelectedId(block.id)}
                    onToggleVisible={() => toggleVisible(block.id)}
                    onDelete={() => removeBlock(block.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Inspector — desktop only */}
        <div className="hidden w-[320px] shrink-0 xl:block">
          <p className="mb-3 font-mono text-label uppercase tracking-[0.1em] text-text-muted">
            Block settings
          </p>
          {selectedBlock ? (
            <BlockInspector
              key={selectedBlock.id}
              block={selectedBlock}
              products={products}
              onChange={(updates) => applyBlockUpdate(selectedBlock.id, updates)}
            />
          ) : (
            <p className="text-small text-text-muted">
              Select a block to edit it.
            </p>
          )}
        </div>
      </div>

      {selectedBlock && (
        <button
          type="button"
          onClick={() => setMobileInspectorOpen(true)}
          className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-[var(--shadow-elevated)] xl:hidden"
          aria-label="Edit selected block"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      )}

      <Modal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        title="Add a block"
      >
        <BlockLibrary onAdd={addBlock} />
      </Modal>

      <Modal
        open={themeOpen}
        onClose={() => setThemeOpen(false)}
        title="Page theme"
      >
        <div className="flex flex-col gap-5">
          <AiThemeDesigner pageId={pageId} onDesigned={applyAiDesign} />
          <ThemePresetPicker value={themePreset} custom={customTheme} onChange={changeTheme} />

          <label className="flex items-start gap-2.5 border-t border-border pt-4 text-body text-text-primary">
            <input
              type="checkbox"
              checked={tabbedView}
              onChange={(e) => changeTabbedView(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-accent"
            />
            <span>
              Links / Shop tabs
              <span className="mt-0.5 block text-small text-text-muted">
                Splits your page into two tabs instead of one scroll. Only
                shown if your page has both link and product blocks.
              </span>
            </span>
          </label>
        </div>
      </Modal>

      {selectedBlock && (
        <Modal
          open={mobileInspectorOpen}
          onClose={() => setMobileInspectorOpen(false)}
          title="Block settings"
          maxWidthClassName="max-w-[420px]"
        >
          <BlockInspector
            key={selectedBlock.id}
            block={selectedBlock}
            products={products}
            onChange={(updates) => applyBlockUpdate(selectedBlock.id, updates)}
          />
        </Modal>
      )}
    </div>
  );
}
