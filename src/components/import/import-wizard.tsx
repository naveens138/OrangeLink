"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  commitImport,
  startManualImport,
  startUrlImport,
  undoImport,
} from "@/app/(dashboard)/dashboard/import/actions";
import type { ImportOutcome } from "@/lib/import/run-import";
import type { ParsedBlock } from "@/lib/import/types";

type Stage =
  | { name: "idle" }
  | { name: "fetching" }
  | { name: "analyzing" }
  | { name: "review"; jobId: string; outcome: ImportOutcome }
  | { name: "imported"; count: number; createdBlockIds: string[] }
  | { name: "manual" }
  | { name: "error"; message: string };

function blockSummary(block: ParsedBlock) {
  const config = block.config as { label?: string; url?: string; platforms?: string[] };
  if (block.type === "social_icons") {
    return { title: "Social icons", detail: (config.platforms ?? []).join(", ") };
  }
  return { title: config.label || "Untitled", detail: config.url ?? "" };
}

export function ImportWizard({ supportedPlatforms }: { supportedPlatforms: string[] }) {
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  async function onFetch() {
    if (!url.trim()) return;
    setStage({ name: "fetching" });
    // The analyzing state is shown while the request is in flight so the wait
    // reads as progress rather than a stall.
    const timer = setTimeout(() => setStage({ name: "analyzing" }), 900);
    const result = await startUrlImport(url.trim());
    clearTimeout(timer);

    if (!result.ok) {
      setStage({ name: "error", message: result.error });
      return;
    }
    if (result.outcome.needsManualPaste) {
      setStage({ name: "manual" });
      return;
    }
    setSelected(new Set(result.outcome.blocks.map((_, i) => i)));
    setStage({ name: "review", jobId: result.jobId, outcome: result.outcome });
  }

  async function onManual() {
    if (!pasted.trim()) return;
    setStage({ name: "analyzing" });
    const result = await startManualImport(pasted);
    if (!result.ok) {
      setStage({ name: "error", message: result.error });
      return;
    }
    if (result.outcome.blocks.length === 0) {
      setStage({ name: "error", message: "We couldn't find any links in that text." });
      return;
    }
    setSelected(new Set(result.outcome.blocks.map((_, i) => i)));
    setStage({ name: "review", jobId: result.jobId, outcome: result.outcome });
  }

  async function onCommit() {
    if (stage.name !== "review") return;
    const chosen = stage.outcome.blocks.filter((_, i) => selected.has(i));
    const result = await commitImport(stage.jobId, chosen);
    if (!result.ok) {
      setStage({ name: "error", message: result.error ?? "Import failed." });
      return;
    }
    setStage({
      name: "imported",
      count: result.inserted ?? chosen.length,
      createdBlockIds: result.createdBlockIds ?? [],
    });
  }

  async function onUndo() {
    if (stage.name !== "imported") return;
    await undoImport(stage.createdBlockIds);
    setStage({ name: "idle" });
    setUrl("");
  }

  // --- idle ---------------------------------------------------------------
  if (stage.name === "idle") {
    return (
      <div className="flex flex-col gap-6">
        <Card className="max-w-2xl">
          <h2 className="text-h3">Import from your old page</h2>
          <p className="mt-2 text-body text-text-secondary">
            Paste your old page&apos;s link and we&apos;ll copy your links.
            Nothing is added until you check them.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Your existing page URL" className="flex-1">
              {(p) => (
                <Input
                  {...p}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://linktr.ee/yourname"
                  onKeyDown={(e) => e.key === "Enter" && onFetch()}
                />
              )}
            </Field>
            <Button onClick={onFetch} disabled={!url.trim()}>
              Fetch page
            </Button>
          </div>

          <p className="mt-4 text-small text-text-muted">
            Works with {supportedPlatforms.slice(0, -1).join(", ")}, and{" "}
            {supportedPlatforms.at(-1)}, plus most other link-in-bio tools.
          </p>
        </Card>

        <button
          type="button"
          onClick={() => setStage({ name: "manual" })}
          className="w-fit text-small font-medium text-accent"
        >
          Or paste your links as text instead
        </button>
      </div>
    );
  }

  // --- progress -----------------------------------------------------------
  if (stage.name === "fetching" || stage.name === "analyzing") {
    return (
      <Card className="flex max-w-2xl flex-col items-center gap-3 py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="text-body text-text-primary">
          {stage.name === "fetching" ? "Fetching your page…" : "Reading your links…"}
        </p>
        <p className="text-small text-text-muted">This usually takes a few seconds.</p>
      </Card>
    );
  }

  // --- manual paste -------------------------------------------------------
  if (stage.name === "manual") {
    return (
      <Card className="max-w-2xl">
        <button
          type="button"
          onClick={() => setStage({ name: "idle" })}
          className="mb-4 inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <h2 className="text-h3">Paste your links</h2>
        <p className="mt-2 text-body text-text-secondary">
          One per line works best. A title on the same line as the URL will be
          used as the link name.
        </p>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={10}
          placeholder={"My YouTube channel https://youtube.com/@me\nShop my presets https://gumroad.com/l/presets"}
          className="mt-4 w-full rounded-md border border-border bg-surface-1 px-4 py-3 font-mono text-small text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-soft"
        />
        <Button onClick={onManual} disabled={!pasted.trim()} className="mt-4">
          Read these links
        </Button>
      </Card>
    );
  }

  // --- error --------------------------------------------------------------
  if (stage.name === "error") {
    return (
      <Card className="max-w-2xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div>
            <h2 className="text-h3">We couldn&apos;t import that</h2>
            <p className="mt-2 text-body text-text-secondary">{stage.message}</p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setStage({ name: "idle" })}>
            Try another URL
          </Button>
          <Button onClick={() => setStage({ name: "manual" })}>
            Paste links instead
          </Button>
        </div>
      </Card>
    );
  }

  // --- imported -----------------------------------------------------------
  if (stage.name === "imported") {
    return (
      <Card className="max-w-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-h3">
              Imported {stage.count} block{stage.count === 1 ? "" : "s"}
            </h2>
            <p className="mt-2 text-body text-text-secondary">
              They were added to the end of your page. Nothing that was already
              there was changed.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/dashboard/links">
            <Button>Open the editor</Button>
          </Link>
          <Button variant="secondary" onClick={onUndo}>
            <Undo2 className="h-4 w-4" />
            Undo this import
          </Button>
        </div>
      </Card>
    );
  }

  // --- review -------------------------------------------------------------
  const { outcome } = stage;
  const flagged = outcome.blocks.filter((b) => b.warnings?.length).length;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-h3">
              Found {outcome.blocks.length} block
              {outcome.blocks.length === 1 ? "" : "s"}
            </h2>
            <p className="mt-1 text-body text-text-secondary">
              Untick anything you don&apos;t want. Nothing is added until you
              confirm.
            </p>
          </div>
          {outcome.aiApplied && (
            <span className="flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-small font-medium text-accent">
              <Sparkles className="h-3 w-3" />
              Titles tidied
            </span>
          )}
        </div>

        {outcome.warnings.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {outcome.warnings.map((w) => (
              <p
                key={w}
                className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2.5 text-small text-warning"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {w}
              </p>
            ))}
          </div>
        )}

        {flagged > 0 && (
          <p className="mt-3 text-small text-text-muted">
            {flagged} item{flagged === 1 ? "" : "s"} need a look before you
            import.
          </p>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        {outcome.blocks.map((block, i) => {
          const { title, detail } = blockSummary(block);
          const isSelected = selected.has(i);
          return (
            <label
              key={`${title}-${i}`}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
                isSelected
                  ? "border-border-strong bg-surface-1"
                  : "border-border bg-surface-2 opacity-60",
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(i);
                  else next.delete(i);
                  setSelected(next);
                }}
                className="mt-1 h-4 w-4 shrink-0 accent-accent"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body text-text-primary">{title}</p>
                <p className="truncate text-small text-text-muted">{detail}</p>
                {block.originalLabel && (
                  <p className="mt-1 text-small text-text-muted">
                    was: <span className="line-through">{block.originalLabel}</span>
                  </p>
                )}
                {block.warnings?.map((w) => (
                  <p key={w} className="mt-1 flex items-center gap-1.5 text-small text-warning">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {w}
                  </p>
                ))}
              </div>
              <span className="shrink-0 font-mono text-label uppercase tracking-[0.1em] text-text-muted">
                {block.type.replace("_", " ")}
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onCommit} disabled={selected.size === 0}>
          Import {selected.size} block{selected.size === 1 ? "" : "s"}
        </Button>
        <Button variant="secondary" onClick={() => setStage({ name: "idle" })}>
          Start over
        </Button>
      </div>
    </div>
  );
}
