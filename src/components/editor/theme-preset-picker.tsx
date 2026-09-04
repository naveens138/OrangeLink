"use client";

import { themePresets, type ThemePreset } from "@/lib/theme-presets";
import { cn } from "@/lib/utils";

const presetOrder: ThemePreset[] = ["minimal", "warm", "soft", "creator"];

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
        const colors = themePresets[preset].dark;
        const active = value === preset;
        return (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-md border p-3 text-left transition-colors duration-[170ms]",
              active
                ? "border-accent"
                : "border-border hover:border-border-strong",
            )}
          >
            <span
              className="h-8 w-full rounded-sm border border-border"
              style={{ background: colors.bg }}
            />
            <span className="text-small capitalize text-text-primary">
              {preset}
            </span>
          </button>
        );
      })}
    </div>
  );
}
