"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { designPageWithAi } from "@/app/(dashboard)/dashboard/links/actions";
import type { CustomTheme } from "@/lib/theme-custom";

const EXAMPLES = [
  "Calm and minimal, soft sage green, serif",
  "Bold and sporty, deep red, square buttons",
  "Warm desert sunset, rounded and friendly",
];

/**
 * The "describe it, get a design" box at the top of the Theme popup. The
 * design is saved as soon as it arrives; picking a preset below undoes it.
 */
export function AiThemeDesigner({
  pageId,
  onDesigned,
}: {
  pageId: string;
  onDesigned: (theme: CustomTheme, tabbedView?: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate(description: string) {
    setError(null);
    startTransition(async () => {
      const result = await designPageWithAi(pageId, description);
      if (result.ok) {
        onDesigned(result.data.theme, result.data.tabbedView);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-1 p-3.5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--accent-strong)]" />
        <p className="text-h3">Design it with AI</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          generate(text);
        }}
        className="flex flex-col gap-2"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          rows={2}
          placeholder="Describe the look you want: colours, mood, fonts, button shape"
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-small text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-black/5"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setText(example)}
                className="rounded-full border border-border px-2.5 py-1 text-[12px] text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
              >
                {example}
              </button>
            ))}
          </div>
          <Button type="submit" size="sm" disabled={pending || text.trim().length < 3}>
            <Sparkles className="h-3.5 w-3.5" />
            {pending ? "Designing…" : "Generate"}
          </Button>
        </div>
      </form>
      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  );
}
