"use client";

import { presetOrder, themePresets, type ThemePreset } from "@/lib/theme-presets";
import { customGradient, FONT_LABELS, type CustomTheme } from "@/lib/theme-custom";
import { cn } from "@/lib/utils";

const PILL_RADIUS: Record<CustomTheme["shape"], string> = {
  round: "999px",
  soft: "5px",
  square: "2px",
};

/**
 * Each swatch is a tiny version of the page: the theme's background with
 * link pills on it, so the choice is made by looking at the result. An AI
 * design, when there is one, leads the grid and is the selected card; the
 * presets below it replace it when picked.
 */
export function ThemePresetPicker({
  value,
  custom,
  onChange,
}: {
  /** Null when a template is in use, so no preset shows as selected. */
  value: ThemePreset | null;
  custom?: CustomTheme | null;
  onChange: (preset: ThemePreset) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {custom && (
        <div className="col-span-2 flex items-center gap-3 rounded-md border border-text-primary p-2.5 ring-1 ring-text-primary">
          <Swatch
            gradient={customGradient(custom)}
            radius={PILL_RADIUS[custom.shape]}
            pill={
              custom.buttons === "outline"
                ? { background: "transparent", boxShadow: `inset 0 0 0 1px ${custom.ink}` }
                : custom.buttons === "frosted"
                  ? { background: "rgba(255,255,255,0.55)" }
                  : undefined
            }
            accent={custom.accent}
            className="w-28 shrink-0"
          />
          <span className="min-w-0">
            <span className="block truncate text-small font-medium text-text-primary">
              AI · {custom.name}
            </span>
            <span className="block text-[12px] text-text-muted">
              {FONT_LABELS[custom.font]} · {custom.shape} {custom.buttons} buttons
            </span>
            {custom.prompt && (
              <span className="mt-0.5 block truncate text-[12px] italic text-text-muted">
                “{custom.prompt}”
              </span>
            )}
          </span>
        </div>
      )}
      {presetOrder.map((preset) => {
        const theme = themePresets[preset];
        const active = !custom && value === preset;
        return (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            aria-pressed={active}
            className={cn(
              "flex flex-col items-start gap-2.5 rounded-md border p-2.5 text-left transition-colors duration-150",
              active
                ? "border-text-primary ring-1 ring-text-primary"
                : "border-border hover:border-border-strong",
            )}
          >
            <Swatch gradient={theme.gradient} className="w-full" />
            <span className="px-0.5">
              <span className="block text-small font-medium text-text-primary">{theme.label}</span>
              <span className="block text-[12px] text-text-muted">{theme.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Swatch({
  gradient,
  radius = "999px",
  pill,
  accent,
  className,
}: {
  gradient: string;
  radius?: string;
  pill?: React.CSSProperties;
  accent?: string;
  className?: string;
}) {
  const pillStyle: React.CSSProperties = {
    borderRadius: radius,
    background: "#fff",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.05)",
    ...pill,
  };
  return (
    <span
      className={cn("flex h-16 flex-col items-center justify-end gap-1 rounded-sm border border-border px-3 pb-2.5", className)}
      style={{ background: gradient }}
    >
      {accent && <span className="mb-auto mt-2 h-2 w-8 rounded-full" style={{ background: accent }} />}
      <span className="h-2.5 w-full" style={pillStyle} />
      <span className="h-2.5 w-full" style={pillStyle} />
    </span>
  );
}
