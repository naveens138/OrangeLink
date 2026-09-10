"use client";

import { presetOrder, themePresets, type ThemePreset } from "@/lib/theme-presets";
import { cn } from "@/lib/utils";

/**
 * Each swatch is a tiny version of the page: the theme's background with a
 * white link pill on it, so the choice is made by looking at the result.
 */
export function ThemePresetPicker({
  value,
  onChange,
}: {
  value: ThemePreset;
  onChange: (preset: ThemePreset) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {presetOrder.map((preset) => {
        const theme = themePresets[preset];
        const active = value === preset;
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
            <span
              className="flex h-16 w-full flex-col items-center justify-end gap-1 rounded-sm border border-border px-3 pb-2.5"
              style={{ background: theme.gradient }}
            >
              <span className="h-2.5 w-full rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)]" />
              <span className="h-2.5 w-full rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)]" />
            </span>
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
