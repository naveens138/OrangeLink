// Full-page templates for the public page, browsed as a gallery in the
// dashboard (the Templates button on the Links page) the way Linktree shows
// its templates.
//
// A template is more than a preset tint: its own background art, text and
// button colours, button style and font. Unlike an AI design these are
// hand-made, so they may use dark or vivid grounds. Every value here is a
// constant in code, and a page only stores the template's id, so nothing a
// creator types ever reaches a style attribute.
//
// Two kinds. Photo templates use a freely licensed photo under a dark wash
// so text stays readable (files and credits in public/templates). Drawn
// templates use inline SVG art, which needs no image request at all.
import type { CSSProperties } from "react";
import { FONT_STACKS, type ThemeFont } from "@/lib/theme-custom";

export type TemplateButtons = "solid" | "outline" | "frosted" | "offset" | "wavy";
export type TemplateShape = "round" | "soft" | "square";

export interface PageTemplate {
  id: string;
  name: string;
  /** One line for the gallery card. */
  vibe: string;
  /** A CSS `background` value: SVG art over a gradient, or a washed photo. */
  background: string;
  /** Photo templates: the file name in public/templates, and the dark wash over it (top, bottom). */
  photo?: string;
  shade?: [number, number];
  /** Page text: name, bio, social icons, footer. */
  ink: string;
  inkSoft: string;
  /** Link and product buttons, and the text on them. */
  pill: string;
  pillInk: string;
  pillInkSoft: string;
  buttons: TemplateButtons;
  shape: TemplateShape;
  /** Hard shadow colour, for the offset button style. */
  edge?: string;
  /** The selected Links / Shop tab. White text sits on it. */
  accent: string;
  font: ThemeFont;
}

const svg = (markup: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(markup.replace(/\s+/g, " ").trim())}")`;

// Art pinned to the bottom of the page, full width.
const bottomArt = (markup: string) => `${svg(markup)} center bottom / 100% auto no-repeat`;
// Art covering the whole page.
const coverArt = (markup: string) => `${svg(markup)} center / cover no-repeat`;
// A photo under a dark wash. The photo is the last layer, so the page's
// background-attachment: fixed lands on it and it stays put while the links
// scroll, instead of stretching over the page's full height. The gallery
// uses the smaller -preview copy.
function photoBackground(photo: string, [top, bottom]: [number, number], preview = false) {
  const file = `/templates/${photo}${preview ? "-preview" : ""}.jpg`;
  return `linear-gradient(180deg, rgba(0,0,0,${top}) 0%, rgba(0,0,0,${bottom}) 100%), url("${file}") center / cover no-repeat`;
}

const RADII: Record<TemplateShape, [string, string]> = {
  round: ["999px", "28px"],
  soft: ["16px", "20px"],
  square: ["4px", "8px"],
};

export const pageTemplates: PageTemplate[] = [
  // Photo templates first: they read strongest in the gallery.
  {
    id: "pool",
    name: "Pool",
    vibe: "Sunlit pool water",
    photo: "pool",
    shade: [0.12, 0.28],
    background: photoBackground("pool", [0.12, 0.28]),
    ink: "#ffffff",
    inkSoft: "#e3f6fb",
    pill: "#ffffff",
    pillInk: "#0f3440",
    pillInkSoft: "#4a6b75",
    buttons: "solid",
    shape: "round",
    accent: "#0f3440",
    font: "sans",
  },
  {
    id: "shore",
    name: "Shore",
    vibe: "Waves from above",
    photo: "shore",
    shade: [0.18, 0.32],
    background: photoBackground("shore", [0.18, 0.32]),
    ink: "#ffffff",
    inkSoft: "#e0f3f3",
    pill: "#ffffff",
    pillInk: "#0b3b45",
    pillInkSoft: "#46707a",
    buttons: "wavy",
    shape: "square",
    accent: "#0b3b45",
    font: "rounded",
  },
  {
    id: "lake",
    name: "Lake",
    vibe: "Mountain lake, still water",
    photo: "lake",
    shade: [0.25, 0.3],
    background: photoBackground("lake", [0.25, 0.3]),
    ink: "#ffffff",
    inkSoft: "#e6eef5",
    pill: "rgba(255,255,255,0.9)",
    pillInk: "#0e2a3a",
    pillInkSoft: "#3d5566",
    buttons: "solid",
    shape: "round",
    accent: "#0e2a3a",
    font: "serif",
  },
  {
    id: "summit",
    name: "Summit",
    vibe: "Snow peak, bold blocks",
    photo: "summit",
    shade: [0.22, 0.3],
    background: photoBackground("summit", [0.22, 0.3]),
    ink: "#ffffff",
    inkSoft: "#e5edf6",
    pill: "#ffffff",
    pillInk: "#13263d",
    pillInkSoft: "#4b5d72",
    buttons: "offset",
    shape: "square",
    edge: "#13263d",
    accent: "#13263d",
    font: "condensed",
  },
  {
    id: "fern",
    name: "Fern",
    vibe: "Fresh green leaves",
    photo: "fern",
    shade: [0.3, 0.38],
    background: photoBackground("fern", [0.3, 0.38]),
    ink: "#ffffff",
    inkSoft: "#e4f2e2",
    pill: "rgba(255,255,255,0.9)",
    pillInk: "#173d1c",
    pillInkSoft: "#40603f",
    buttons: "solid",
    shape: "soft",
    accent: "#173d1c",
    font: "sans",
  },
  {
    id: "petunia",
    name: "Petunia",
    vibe: "A field of pink flowers",
    photo: "petunia",
    shade: [0.3, 0.38],
    background: photoBackground("petunia", [0.3, 0.38]),
    ink: "#ffffff",
    inkSoft: "#ffe6f1",
    pill: "#ffffff",
    pillInk: "#8a1f4f",
    pillInkSoft: "#9e5a78",
    buttons: "solid",
    shape: "round",
    accent: "#8a1f4f",
    font: "serif",
  },
  {
    id: "citrus",
    name: "Citrus",
    vibe: "Sliced oranges and limes",
    photo: "citrus",
    shade: [0.38, 0.45],
    background: photoBackground("citrus", [0.38, 0.45]),
    ink: "#ffffff",
    inkSoft: "#fff1e0",
    pill: "#ffffff",
    pillInk: "#1a1a1a",
    pillInkSoft: "#5c5c5c",
    buttons: "solid",
    shape: "soft",
    accent: "#d9661a",
    font: "rounded",
  },
  {
    id: "lanes",
    name: "Lanes",
    vibe: "Running-track numbers",
    photo: "lanes",
    shade: [0.42, 0.5],
    background: photoBackground("lanes", [0.42, 0.5]),
    ink: "#ffffff",
    inkSoft: "#f2e3e1",
    pill: "#ffffff",
    pillInk: "#b3261e",
    pillInkSoft: "#8a4a45",
    buttons: "wavy",
    shape: "square",
    accent: "#b3261e",
    font: "condensed",
  },
  {
    id: "dusk",
    name: "Dusk",
    vibe: "Pink and violet sunset",
    photo: "dusk",
    shade: [0.2, 0.35],
    background: photoBackground("dusk", [0.2, 0.35]),
    ink: "#ffffff",
    inkSoft: "#f7e6f0",
    pill: "rgba(255,255,255,0.9)",
    pillInk: "#3b1d3f",
    pillInkSoft: "#6a4a6c",
    buttons: "solid",
    shape: "round",
    accent: "#3b1d3f",
    font: "serif",
  },
  {
    id: "city-glow",
    name: "City Glow",
    vibe: "Orange sky over city lights",
    photo: "city-glow",
    shade: [0.2, 0.4],
    background: photoBackground("city-glow", [0.2, 0.4]),
    ink: "#ffffff",
    inkSoft: "#ffe9d6",
    pill: "transparent",
    pillInk: "#ffffff",
    pillInkSoft: "#ffe9d6",
    buttons: "outline",
    shape: "round",
    accent: "#c2521f",
    font: "rounded",
  },
  {
    id: "bokeh",
    name: "Bokeh",
    vibe: "Warm lights at night",
    photo: "bokeh",
    shade: [0.35, 0.45],
    background: photoBackground("bokeh", [0.35, 0.45]),
    ink: "#ffffff",
    inkSoft: "#f5e7d0",
    pill: "transparent",
    pillInk: "#ffd48a",
    pillInkSoft: "#ffe6ba",
    buttons: "outline",
    shape: "round",
    accent: "#a8641c",
    font: "mono",
  },
  {
    id: "marble",
    name: "Marble",
    vibe: "White stone, black blocks",
    photo: "marble",
    shade: [0, 0],
    background: photoBackground("marble", [0, 0]),
    ink: "#1c1c1c",
    inkSoft: "#4d4d4d",
    pill: "#1c1c1c",
    pillInk: "#ffffff",
    pillInkSoft: "#cfcfcf",
    buttons: "solid",
    shape: "square",
    accent: "#1c1c1c",
    font: "serif",
  },
  {
    id: "onyx",
    name: "Onyx",
    vibe: "Swirled agate stone",
    photo: "onyx",
    shade: [0.4, 0.48],
    background: photoBackground("onyx", [0.4, 0.48]),
    ink: "#ffffff",
    inkSoft: "#f3e6d8",
    pill: "#fff7ec",
    pillInk: "#5a2e12",
    pillInkSoft: "#80573c",
    buttons: "solid",
    shape: "soft",
    accent: "#5a2e12",
    font: "serif",
  },

  // Drawn templates.
  {
    id: "jungle",
    name: "Jungle",
    vibe: "Deep green with lime leaves",
    background: [
      coverArt(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <g fill="#9ccc3c" opacity=".85">
          <path d="M300 -10 C 420 40 440 170 360 230 C 340 150 300 90 300 -10z"/>
          <path d="M-20 560 C 90 560 150 660 120 800 L -20 800z"/>
        </g>
        <g fill="#6aa82a" opacity=".9">
          <path d="M-30 -20 C 80 20 120 150 40 210 C 20 120 -10 60 -30 -20z"/>
          <path d="M420 600 C 300 610 250 720 290 830 L 420 830z"/>
        </g>
        <g fill="none" stroke="#c7e86a" stroke-width="3" opacity=".6">
          <path d="M320 10 C 350 80 360 140 355 210"/><path d="M-10 590 C 60 630 100 700 110 790"/>
        </g>
      </svg>`),
      "linear-gradient(180deg, #2f7d22 0%, #276b1c 100%)",
    ].join(", "),
    ink: "#ffffff",
    inkSoft: "#e3f3d3",
    pill: "#ffffff",
    pillInk: "#1e3d14",
    pillInkSoft: "#4f6a45",
    buttons: "solid",
    shape: "square",
    accent: "#1e3d14",
    font: "serif",
  },
  {
    id: "cloud-line",
    name: "Cloud Line",
    vibe: "Airy white, hand-drawn clouds",
    background: [
      coverArt(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="#3144c9" stroke-width="2" stroke-linecap="round">
          <path d="M240 -10 c-30 40 10 70 40 60 c10 40 60 40 80 10 c30 20 70 0 60 -40"/>
          <path d="M-10 250 c40 -10 60 30 40 60 c40 10 40 60 0 80 c20 30 0 70 -40 60"/>
          <path d="M410 470 c-40 0 -60 40 -40 70 c-40 10 -40 60 0 80 c-20 30 10 70 50 50"/>
          <path d="M60 820 c10 -40 60 -50 80 -20 c20 -40 80 -30 80 10"/>
        </g>
      </svg>`),
      "linear-gradient(180deg, #fbfbff 0%, #f3f4fd 100%)",
    ].join(", "),
    ink: "#2a3bb8",
    inkSoft: "#5463c7",
    pill: "transparent",
    pillInk: "#2a3bb8",
    pillInkSoft: "#5463c7",
    buttons: "outline",
    shape: "round",
    accent: "#2a3bb8",
    font: "rounded",
  },
  {
    id: "haze",
    name: "Haze",
    vibe: "Blue-to-peach blur, offset shadow",
    background:
      "radial-gradient(120% 60% at 0% 0%, #b9cdf0 0%, transparent 60%), radial-gradient(120% 70% at 100% 100%, #f5b49a 0%, transparent 60%), linear-gradient(180deg, #dfe5f3 0%, #ecd9d6 100%)",
    ink: "#1d2233",
    inkSoft: "#4a5068",
    pill: "#ffffff",
    pillInk: "#1d2233",
    pillInkSoft: "#5b6074",
    buttons: "offset",
    shape: "soft",
    edge: "#9fb2d6",
    accent: "#1d2233",
    font: "sans",
  },
  {
    id: "dunes",
    name: "Dunes",
    vibe: "Sand waves, soft serif",
    background: [
      bottomArt(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
        <path d="M0 120 C 90 70 170 150 260 110 S 400 90 400 90 V300 H0z" fill="#e7cfa6"/>
        <path d="M0 180 C 110 130 200 220 300 170 S 400 160 400 160 V300 H0z" fill="#d9b886"/>
        <path d="M0 240 C 120 200 220 280 320 240 S 400 230 400 230 V300 H0z" fill="#c9a06a"/>
      </svg>`),
      "linear-gradient(180deg, #fbf3e6 0%, #f5e6cc 100%)",
    ].join(", "),
    ink: "#4a3521",
    inkSoft: "#7a6048",
    pill: "#fffaf2",
    pillInk: "#4a3521",
    pillInkSoft: "#7a6048",
    buttons: "solid",
    shape: "soft",
    accent: "#8a5a2b",
    font: "serif",
  },
];

const byId = new Map(pageTemplates.map((t) => [t.id, t]));

export function getTemplate(id: unknown): PageTemplate | null {
  return typeof id === "string" ? (byId.get(id) ?? null) : null;
}

/** The CSS variables the storefront reads, plus the button style. */
export function templateStyle(
  template: PageTemplate,
  { preview = false }: { preview?: boolean } = {},
): {
  style: CSSProperties;
  buttons: TemplateButtons;
} {
  const [linkRadius, cardRadius] = RADII[template.shape];
  return {
    buttons: template.buttons,
    style: {
      "--storefront-gradient":
        preview && template.photo && template.shade
          ? photoBackground(template.photo, template.shade, true)
          : template.background,
      "--text-primary": template.ink,
      "--text-secondary": template.inkSoft,
      "--text-muted": template.inkSoft,
      "--pill": template.pill,
      "--pill-hover": template.pill,
      "--pill-ink": template.pillInk,
      "--pill-ink-soft": template.pillInkSoft,
      "--pill-edge": template.edge ?? template.pillInk,
      "--storefront-accent": template.accent,
      "--link-radius": linkRadius,
      "--card-radius": cardRadius,
      // The desktop card stays see-through so the art shows.
      "--card": "transparent",
      fontFamily: FONT_STACKS[template.font],
    } as CSSProperties,
  };
}
