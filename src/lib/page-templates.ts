// Full-page templates for the public page, browsed as a gallery in the
// dashboard (/dashboard/templates) the way Linktree shows its templates.
//
// A template is more than a preset tint: its own background art, text and
// button colours, button style and font. Unlike an AI design these are
// hand-made, so they may use dark or vivid grounds. Every value here is a
// constant in code, and a page only stores the template's id, so nothing a
// creator types ever reaches a style attribute.
//
// Background art is inline SVG rather than photos: no image requests, no
// licences to track, and it stays sharp at any size.
import type { CSSProperties } from "react";
import { FONT_STACKS, type ThemeFont } from "@/lib/theme-custom";

export type TemplateButtons = "solid" | "outline" | "frosted" | "offset" | "wavy";
export type TemplateShape = "round" | "soft" | "square";

export interface PageTemplate {
  id: string;
  name: string;
  /** One line for the gallery card. */
  vibe: string;
  /** A CSS `background` value: layers of SVG art over a gradient. */
  background: string;
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
// A repeating tile.
const tile = (markup: string, size: number) => `${svg(markup)} 0 0 / ${size}px ${size}px repeat`;

const RADII: Record<TemplateShape, [string, string]> = {
  round: ["999px", "28px"],
  soft: ["16px", "20px"],
  square: ["4px", "8px"],
};

export const pageTemplates: PageTemplate[] = [
  {
    id: "olive-grove",
    name: "Olive Grove",
    vibe: "Muted olive with ripe fruit",
    background: [
      bottomArt(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220">
        <ellipse cx="200" cy="215" rx="230" ry="30" fill="#3f4433"/>
        <circle cx="70" cy="170" r="48" fill="#e9923f"/><path d="M70 122 a48 48 0 0 1 0 96" fill="#d97a2b"/>
        <circle cx="160" cy="185" r="36" fill="#a9b86a"/><circle cx="160" cy="185" r="22" fill="#c7d38b"/>
        <circle cx="255" cy="172" r="44" fill="#f2c14e"/><circle cx="240" cy="160" r="8" fill="#fbe39a"/>
        <circle cx="345" cy="182" r="40" fill="#7a8f4f"/><circle cx="330" cy="170" r="10" fill="#9aad69"/>
        <path d="M120 150 q18 -30 40 -10 q-18 22 -40 10z" fill="#5d6b3a"/>
      </svg>`),
      "linear-gradient(180deg, #6f775b 0%, #626a4f 100%)",
    ].join(", "),
    ink: "#ffffff",
    inkSoft: "#e3e6d8",
    pill: "#dcdcd2",
    pillInk: "#2c3024",
    pillInkSoft: "#5c6150",
    buttons: "solid",
    shape: "round",
    accent: "#2c3024",
    font: "sans",
  },
  {
    id: "poolside",
    name: "Poolside",
    vibe: "Sunlit water, white buttons",
    background: [
      coverArt(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="#bff3f2" stroke-width="3" stroke-linecap="round" opacity=".55">
          <path d="M-20 80 q40 -22 80 0 t80 0 t80 0 t80 0 t80 0"/>
          <path d="M-20 190 q40 -18 80 4 t80 -6 t80 6 t80 -4 t80 2"/>
          <path d="M-20 320 q50 -24 90 0 t90 0 t90 0 t90 0"/>
          <path d="M-20 460 q40 -20 80 2 t80 -4 t80 4 t80 -2 t80 0"/>
          <path d="M-20 600 q50 -22 90 0 t90 0 t90 0 t90 0"/>
          <path d="M-20 730 q40 -18 80 2 t80 -2 t80 2 t80 -2 t80 0"/>
        </g>
        <g fill="#e8fffe" opacity=".35"><circle cx="90" cy="140" r="5"/><circle cx="310" cy="260" r="4"/><circle cx="60" cy="520" r="6"/><circle cx="330" cy="660" r="5"/></g>
      </svg>`),
      "linear-gradient(180deg, #3fb7bf 0%, #2a9aa6 55%, #1f7f8e 100%)",
    ].join(", "),
    ink: "#ffffff",
    inkSoft: "#dff6f6",
    pill: "#ffffff",
    pillInk: "#12343a",
    pillInkSoft: "#4d6d72",
    buttons: "solid",
    shape: "round",
    accent: "#12343a",
    font: "sans",
  },
  {
    id: "clay",
    name: "Clay",
    vibe: "Dark earth, peach blocks",
    background: [
      coverArt(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="#8a6a55" stroke-width="1.5" opacity=".45">
          <path d="M-40 620 C80 540 160 700 300 600 S460 560 460 560"/>
          <path d="M-40 650 C80 570 170 730 300 630 S460 590 460 590"/>
          <path d="M-40 680 C90 600 180 760 310 660 S460 620 460 620"/>
          <path d="M-40 140 C70 220 180 60 300 150 S460 120 460 120"/>
          <path d="M-40 170 C70 250 190 90 300 180 S460 150 460 150"/>
        </g>
      </svg>`),
      "linear-gradient(170deg, #5b4a40 0%, #3e332d 60%, #2b2420 100%)",
    ].join(", "),
    ink: "#ffffff",
    inkSoft: "#e2d6cc",
    pill: "#e8a47c",
    pillInk: "#ffffff",
    pillInkSoft: "#fff1e8",
    buttons: "solid",
    shape: "square",
    accent: "#c9794d",
    font: "rounded",
  },
  {
    id: "track",
    name: "Track",
    vibe: "Running-track blue, wavy edges",
    background: [
      coverArt(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="#ffffff" stroke-width="9" opacity=".85">
          <path d="M520 -40 C 240 120 120 360 -60 520"/>
          <path d="M560 60 C 300 220 190 470 -20 700"/>
          <path d="M600 190 C 380 330 280 600 120 860"/>
        </g>
      </svg>`),
      "linear-gradient(160deg, #2b7de0 0%, #1b62c4 60%, #144f9f 100%)",
    ].join(", "),
    ink: "#ffffff",
    inkSoft: "#dbe9ff",
    pill: "#ffffff",
    pillInk: "#123a73",
    pillInkSoft: "#4f6e99",
    buttons: "wavy",
    shape: "square",
    accent: "#0f2f5c",
    font: "sans",
  },
  {
    id: "concrete",
    name: "Concrete",
    vibe: "Skatepark grey, crisp white",
    background: [
      coverArt(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <circle cx="330" cy="140" r="260" fill="#8d8f92" opacity=".35"/>
        <circle cx="60" cy="700" r="300" fill="#5d5f63" opacity=".4"/>
        <circle cx="60" cy="700" r="220" fill="none" stroke="#b9bbbe" stroke-width="2" opacity=".5"/>
        <circle cx="330" cy="140" r="200" fill="none" stroke="#c4c6c8" stroke-width="2" opacity=".4"/>
      </svg>`),
      "linear-gradient(180deg, #7a7c80 0%, #6a6c70 100%)",
    ].join(", "),
    ink: "#ffffff",
    inkSoft: "#eceded",
    pill: "#ffffff",
    pillInk: "#161718",
    pillInkSoft: "#5a5c60",
    buttons: "solid",
    shape: "soft",
    accent: "#161718",
    font: "sans",
  },
  {
    id: "bakery",
    name: "Bakery",
    vibe: "Warm caramel, cream and red",
    background: [
      coverArt(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <ellipse cx="380" cy="80" rx="190" ry="140" fill="#f3c9a0" opacity=".7"/>
        <ellipse cx="0" cy="760" rx="240" ry="170" fill="#b8541f" opacity=".45"/>
        <path d="M-10 420 C 120 360 260 480 420 400" fill="none" stroke="#fbe2c6" stroke-width="30" opacity=".35" stroke-linecap="round"/>
      </svg>`),
      "linear-gradient(165deg, #e39a5c 0%, #cf7437 55%, #a9531f 100%)",
    ].join(", "),
    ink: "#ffffff",
    inkSoft: "#fde9d6",
    pill: "#fff6ec",
    pillInk: "#c0281c",
    pillInkSoft: "#9a4a33",
    buttons: "wavy",
    shape: "square",
    accent: "#c0281c",
    font: "serif",
  },
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
    id: "midnight",
    name: "Midnight",
    vibe: "Near-black with a fine grid",
    background: [
      tile(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M32 0H0V32" fill="none" stroke="#ffffff" stroke-opacity=".06"/></svg>`, 32),
      "radial-gradient(80% 50% at 50% 0%, #26283a 0%, transparent 70%)",
      "linear-gradient(180deg, #111218 0%, #0b0c10 100%)",
    ].join(", "),
    ink: "#ffffff",
    inkSoft: "#a9adbb",
    pill: "#1c1e27",
    pillInk: "#ffffff",
    pillInkSoft: "#a9adbb",
    buttons: "solid",
    shape: "round",
    accent: "#ff4812",
    font: "sans",
  },
  {
    id: "sunset",
    name: "Sunset",
    vibe: "Pink, orange and violet glow",
    background:
      "radial-gradient(90% 55% at 15% 10%, #ffb36b 0%, transparent 65%), radial-gradient(90% 60% at 90% 40%, #ff5f8f 0%, transparent 65%), radial-gradient(100% 60% at 30% 100%, #7b4dff 0%, transparent 70%), linear-gradient(180deg, #ff8a6b 0%, #c255b8 100%)",
    ink: "#ffffff",
    inkSoft: "#fff0f5",
    pill: "rgba(255,255,255,0.5)",
    pillInk: "#3a1450",
    pillInkSoft: "#6b3f7a",
    buttons: "frosted",
    shape: "round",
    accent: "#3a1450",
    font: "rounded",
  },
  {
    id: "paper",
    name: "Paper",
    vibe: "Cream dot grid, typewriter",
    background: [
      tile(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"><circle cx="2" cy="2" r="1.2" fill="#b9ad96"/></svg>`, 22),
      "linear-gradient(180deg, #f6f1e6 0%, #efe7d6 100%)",
    ].join(", "),
    ink: "#1b1a17",
    inkSoft: "#5a5446",
    pill: "#fffdf8",
    pillInk: "#1b1a17",
    pillInkSoft: "#6b6557",
    buttons: "outline",
    shape: "square",
    accent: "#1b1a17",
    font: "mono",
  },
  {
    id: "citrus",
    name: "Citrus",
    vibe: "OrangeLink orange, bold and loud",
    background: [
      coverArt(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <g transform="translate(360 90)">
          <circle r="120" fill="#ffb23f"/><circle r="104" fill="#ffd27a"/>
          <g stroke="#ffb23f" stroke-width="6"><path d="M0 -104V104M-104 0H104M-74 -74L74 74M74 -74L-74 74"/></g>
        </g>
        <g transform="translate(20 740)">
          <circle r="150" fill="#ffb23f"/><circle r="130" fill="#ffd27a"/>
          <g stroke="#ffb23f" stroke-width="7"><path d="M0 -130V130M-130 0H130M-92 -92L92 92M92 -92L-92 92"/></g>
        </g>
      </svg>`),
      "linear-gradient(180deg, #ff5a1f 0%, #ff7a2e 100%)",
    ].join(", "),
    ink: "#ffffff",
    inkSoft: "#fff1e6",
    pill: "#ffffff",
    pillInk: "#1a1a1a",
    pillInkSoft: "#5c5c5c",
    buttons: "offset",
    shape: "soft",
    edge: "#1a1a1a",
    accent: "#1a1a1a",
    font: "condensed",
  },
  {
    id: "mint-check",
    name: "Mint Check",
    vibe: "Mint checkerboard, black pills",
    background: [
      tile(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="24" height="24" fill="#c3ecd6"/><rect x="24" y="24" width="24" height="24" fill="#c3ecd6"/></svg>`, 48),
      "linear-gradient(180deg, #e2f7ec 0%, #d8f3e4 100%)",
    ].join(", "),
    ink: "#0f2a1d",
    inkSoft: "#3c5a4b",
    pill: "#111111",
    pillInk: "#ffffff",
    pillInkSoft: "#cfcfcf",
    buttons: "solid",
    shape: "round",
    accent: "#111111",
    font: "sans",
  },
  {
    id: "lilac-dream",
    name: "Lilac Dream",
    vibe: "Soft lilac with sparkles",
    background: [
      coverArt(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <g fill="#ffffff">
          <path d="M60 110 l6 18 l18 6 l-18 6 l-6 18 l-6 -18 l-18 -6 l18 -6z" opacity=".9"/>
          <path d="M340 60 l4 12 l12 4 l-12 4 l-4 12 l-4 -12 l-12 -4 l12 -4z" opacity=".8"/>
          <path d="M350 420 l7 20 l20 7 l-20 7 l-7 20 l-7 -20 l-20 -7 l20 -7z" opacity=".85"/>
          <path d="M40 620 l4 12 l12 4 l-12 4 l-4 12 l-4 -12 l-12 -4 l12 -4z" opacity=".8"/>
          <path d="M300 720 l5 15 l15 5 l-15 5 l-5 15 l-5 -15 l-15 -5 l15 -5z" opacity=".7"/>
        </g>
      </svg>`),
      "radial-gradient(90% 60% at 80% 0%, #f1d9ff 0%, transparent 70%)",
      "linear-gradient(180deg, #e3d4fb 0%, #cdb8f3 100%)",
    ].join(", "),
    ink: "#34205a",
    inkSoft: "#5d4a80",
    pill: "rgba(255,255,255,0.5)",
    pillInk: "#34205a",
    pillInkSoft: "#5d4a80",
    buttons: "frosted",
    shape: "round",
    accent: "#34205a",
    font: "rounded",
  },
  {
    id: "retro",
    name: "Retro",
    vibe: "Mustard stripes, navy blocks",
    background: [
      tile(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><path d="M-10 50 L50 -10 M-30 30 L30 -30 M10 70 L70 10" stroke="#e6a93a" stroke-width="10"/></svg>`, 40),
      "linear-gradient(180deg, #f3c552 0%, #f0bb45 100%)",
    ].join(", "),
    ink: "#1f3a5f",
    inkSoft: "#34507a",
    pill: "#1f3a5f",
    pillInk: "#ffffff",
    pillInkSoft: "#d6e1f0",
    buttons: "offset",
    shape: "square",
    edge: "#0e1d33",
    accent: "#1f3a5f",
    font: "condensed",
  },
  {
    id: "neon",
    name: "Neon",
    vibe: "Deep purple, cyan outlines",
    background:
      "radial-gradient(70% 45% at 100% 0%, rgba(255,64,180,.45) 0%, transparent 70%), radial-gradient(70% 45% at 0% 100%, rgba(62,240,255,.35) 0%, transparent 70%), linear-gradient(180deg, #1a0c3a 0%, #0e0724 100%)",
    ink: "#ffffff",
    inkSoft: "#c9c2ea",
    pill: "transparent",
    pillInk: "#7ff4ff",
    pillInkSoft: "#b8f9ff",
    buttons: "outline",
    shape: "round",
    accent: "#ff40b4",
    font: "mono",
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
export function templateStyle(template: PageTemplate): {
  style: CSSProperties;
  buttons: TemplateButtons;
} {
  const [linkRadius, cardRadius] = RADII[template.shape];
  return {
    buttons: template.buttons,
    style: {
      "--storefront-gradient": template.background,
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
