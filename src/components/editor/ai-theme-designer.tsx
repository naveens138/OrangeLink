"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { designPageWithAi } from "@/app/(dashboard)/dashboard/links/actions";
import type { CustomTheme } from "@/lib/theme-custom";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Calm and minimal, sage green, serif",
  "Bold and sporty, deep red, square buttons",
  "Warm sunset, rounded and friendly",
];

/**
 * The AI editor on the Links page, shaped like a chat composer: describe
 * the look, press Enter (or the arrow), and the design is saved and shows in
 * the live preview. The applied design is named underneath with a way to
 * remove it.
 */
export function AiThemeDesigner({
  pageId,
  current,
  onDesigned,
  onRemove,
}: {
  pageId: string;
  current: CustomTheme | null;
  onDesigned: (theme: CustomTheme, tabbedView?: boolean) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const canSend = !pending && text.trim().length >= 3;

  function generate() {
    if (!canSend) return;
    setError(null);
    startTransition(async () => {
      const result = await designPageWithAi(pageId, text);
      if (result.ok) {
        onDesigned(result.data.theme, result.data.tabbedView);
        setText("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          generate();
        }}
        className={cn(
          "rounded-2xl border bg-background p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.04)] transition-colors",
          pending ? "border-border-strong" : "border-border focus-within:border-border-strong",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              generate();
            }
          }}
          maxLength={280}
          rows={2}
          disabled={pending}
          placeholder="Describe how your page should look… colours, mood, fonts, button shape"
          className="block w-full resize-none bg-transparent px-1 text-body text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[12px] text-text-muted">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
            {pending ? "Designing your page…" : "AI design"}
          </span>
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Design with AI"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-text-primary text-white transition-[opacity,transform] duration-100 hover:opacity-90 active:scale-95 disabled:bg-surface-3 disabled:text-text-muted"
          >
            {pending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        {current ? (
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface-1 py-1 pl-2.5 pr-1 text-[12px] text-text-secondary">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: current.accent }} />
            Using “{current.name}”
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove AI design"
              className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-surface-2 hover:text-text-primary"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ) : null}
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setText(example);
              inputRef.current?.focus();
            }}
            className="rounded-full border border-border px-2.5 py-1 text-[12px] text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
          >
            {example}
          </button>
        ))}
      </div>
      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  );
}
