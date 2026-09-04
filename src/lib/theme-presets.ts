// DESIGN_SYSTEM.md §12 — curated public-page presets. No arbitrary CSS in
// MVP: creators choose one of these, nothing else.
export type ThemePreset = "minimal" | "warm" | "soft" | "creator";

export const themePresets: Record<
  ThemePreset,
  { dark: { bg: string; fg: string }; light: { bg: string; fg: string } }
> = {
  minimal: {
    dark: { bg: "#101010", fg: "#ffffff" },
    light: { bg: "#fafaf8", fg: "#111111" },
  },
  warm: {
    dark: { bg: "#15120f", fg: "#ffffff" },
    light: { bg: "#fff9f2", fg: "#18130d" },
  },
  soft: {
    dark: { bg: "#101214", fg: "#ffffff" },
    light: { bg: "#f5f7f8", fg: "#151719" },
  },
  creator: {
    dark: { bg: "#0f0f12", fg: "#ffffff" },
    light: { bg: "#f7f5fa", fg: "#17151a" },
  },
};
