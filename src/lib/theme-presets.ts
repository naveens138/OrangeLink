// The public page's themes. Curated rather than free-form: a creator picks
// one of these and nothing else. Each is the background the storefront sits
// on (the white card, pills and text stay the same), all light, in the
// landing page's palette: white at the top fading into a tint.
export type ThemePreset = "minimal" | "warm" | "soft" | "creator";

export const themePresets: Record<
  ThemePreset,
  { label: string; description: string; gradient: string }
> = {
  warm: {
    label: "Warm",
    description: "White into soft peach",
    gradient: "linear-gradient(180deg, #f6f5f2 0%, #f7f1ec 45%, #fde3d5 100%)",
  },
  minimal: {
    label: "Minimal",
    description: "Plain, neutral grey",
    gradient: "linear-gradient(180deg, #f7f7f6 0%, #f2f1ef 45%, #e7e6e3 100%)",
  },
  soft: {
    label: "Soft",
    description: "White into cool blue",
    gradient: "linear-gradient(180deg, #f5f7f8 0%, #eef3f6 45%, #dde9f2 100%)",
  },
  creator: {
    label: "Creator",
    description: "White into lilac",
    gradient: "linear-gradient(180deg, #f7f6fa 0%, #f3eff9 45%, #e7ddf6 100%)",
  },
};

export const presetOrder: ThemePreset[] = ["warm", "minimal", "soft", "creator"];

/** What a page without a saved choice gets: the look the storefront launched with. */
export const DEFAULT_PRESET: ThemePreset = "warm";

export function isThemePreset(value: unknown): value is ThemePreset {
  return typeof value === "string" && value in themePresets;
}
