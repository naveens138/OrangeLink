// A creator's own design for their public page, made by the AI editor.
//
// It is deliberately a small menu rather than free CSS: three background
// colours, text and accent colours, one of five fonts, a button shape and a
// button style. That keeps every generated page recognisably an OrangeLink
// page, and means everything that reaches the page's style attribute is
// either a validated hex colour or a value from a fixed list.
//
// normalizeCustomTheme is the gate. It runs on the AI's output before
// saving AND on the stored value before rendering, and it repairs colours
// rather than trusting them: backgrounds are lightened until they're
// genuinely light, text is darkened until it reads on white buttons and on
// the background, and the accent is darkened until white text on it passes.
import type { CSSProperties } from "react";

export const THEME_FONTS = ["sans", "serif", "rounded", "mono", "condensed"] as const;
export const THEME_SHAPES = ["round", "soft", "square"] as const;
export const THEME_BUTTONS = ["solid", "outline", "frosted"] as const;

export type ThemeFont = (typeof THEME_FONTS)[number];
export type ThemeShape = (typeof THEME_SHAPES)[number];
export type ThemeButtons = (typeof THEME_BUTTONS)[number];

export interface CustomTheme {
  name: string;
  /** Top, middle and bottom of the page background. */
  gradient: [string, string, string];
  ink: string;
  /** Faded ink for secondary text; derived by normalizeCustomTheme. */
  secondary: string;
  accent: string;
  font: ThemeFont;
  shape: ThemeShape;
  buttons: ThemeButtons;
  /** What the creator asked for, shown back to them in the editor. */
  prompt?: string;
}

export const FONT_STACKS: Record<ThemeFont, string> = {
  sans: 'system-ui, -apple-system, "SF Pro Text", "Segoe UI", sans-serif',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif',
  rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", "Arial Rounded MT Bold", system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace',
  condensed: '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", system-ui, sans-serif',
};

export const FONT_LABELS: Record<ThemeFont, string> = {
  sans: "Clean sans",
  serif: "Serif",
  rounded: "Rounded",
  mono: "Mono",
  condensed: "Condensed",
};

// Link pill radius, then card radius, per shape.
const RADII: Record<ThemeShape, [string, string]> = {
  round: ["999px", "28px"],
  soft: ["18px", "20px"],
  square: ["8px", "10px"],
};

// --- colour maths ---------------------------------------------------------

type Rgb = [number, number, number];

const HEX_RE = /^#([0-9a-f]{6})$/i;

function parseHex(value: unknown): Rgb | null {
  if (typeof value !== "string") return null;
  const m = HEX_RE.exec(value.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// WCAG relative luminance and contrast ratio.
function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

/** Moves a colour toward `target` in small steps until `ok` holds. */
function nudge(color: Rgb, target: Rgb, ok: (c: Rgb) => boolean): Rgb {
  let c = color;
  for (let i = 0; i < 20 && !ok(c); i++) c = mix(c, target, 0.15);
  return ok(c) ? c : target;
}

// --- the gate -------------------------------------------------------------

/**
 * Returns a safe, complete theme, or null if the input isn't a theme at
 * all. Colours that are valid hex but unreadable are repaired, not rejected.
 */
export function normalizeCustomTheme(input: unknown): CustomTheme | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;

  const stops = Array.isArray(raw.gradient) ? raw.gradient.map(parseHex) : [];
  const ink = parseHex(raw.ink);
  const accent = parseHex(raw.accent);
  if (stops.length !== 3 || stops.some((s) => !s) || !ink || !accent) return null;

  // Backgrounds stay light: the page's text, white buttons and shadows are
  // designed for a light ground.
  const gradient = (stops as Rgb[]).map((s) => nudge(s, WHITE, (c) => luminance(c) >= 0.72));
  const bottom = gradient[2];

  // Text must read on the white buttons and on the palest-to-darkest ground.
  const safeInk = nudge(ink, BLACK, (c) => contrast(c, WHITE) >= 9 && contrast(c, bottom) >= 7);
  // Secondary text: the ink faded toward white, but still readable.
  const secondary = nudge(mix(safeInk, WHITE, 0.4), safeInk, (c) => contrast(c, bottom) >= 4.6);
  // White text sits on the accent (the selected tab).
  const safeAccent = nudge(accent, BLACK, (c) => contrast(c, WHITE) >= 4.6);

  const pick = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
    list.includes(value as T) ? (value as T) : fallback;

  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 40) : "";
  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim().slice(0, 280) : undefined;

  return {
    name: name || "Custom",
    gradient: gradient.map(toHex) as [string, string, string],
    ink: toHex(safeInk),
    secondary: toHex(secondary),
    accent: toHex(safeAccent),
    font: pick(THEME_FONTS, raw.font, "sans"),
    shape: pick(THEME_SHAPES, raw.shape, "round"),
    buttons: pick(THEME_BUTTONS, raw.buttons, "solid"),
    ...(prompt ? { prompt } : {}),
  };
}

export function customGradient(theme: CustomTheme): string {
  const [a, b, c] = theme.gradient;
  return `linear-gradient(180deg, ${a} 0%, ${b} 45%, ${c} 100%)`;
}

/**
 * The CSS custom properties the storefront reads, plus the button-style
 * attribute. Only ever built from a normalised theme.
 */
export function customThemeStyle(theme: CustomTheme): {
  style: CSSProperties;
  buttons: ThemeButtons;
} {
  const [linkRadius, cardRadius] = RADII[theme.shape];
  return {
    buttons: theme.buttons,
    style: {
      "--storefront-gradient": customGradient(theme),
      "--text-primary": theme.ink,
      "--text-secondary": theme.secondary,
      "--text-muted": theme.secondary,
      "--storefront-accent": theme.accent,
      "--link-radius": linkRadius,
      "--card-radius": cardRadius,
      fontFamily: FONT_STACKS[theme.font],
    } as CSSProperties,
  };
}
