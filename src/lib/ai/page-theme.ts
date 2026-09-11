import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import {
  normalizeCustomTheme,
  THEME_BUTTONS,
  THEME_FONTS,
  THEME_SHAPES,
  type CustomTheme,
} from "@/lib/theme-custom";

/**
 * Turns a creator's description ("calm, sage green, a bit editorial") into
 * a page design from the fixed menu in lib/theme-custom.ts.
 *
 * The model only picks values; normalizeCustomTheme then repairs any
 * colour that wouldn't be readable, so what gets saved is safe regardless
 * of what comes back.
 */

const DesignSchema = z.object({
  name: z.string().describe("A 2 to 4 word name for the look, e.g. 'Sage and paper'."),
  background_top: z.string().describe("Hex colour #rrggbb for the top of the page. Very light."),
  background_middle: z.string().describe("Hex colour #rrggbb for the middle of the page. Light."),
  background_bottom: z
    .string()
    .describe("Hex colour #rrggbb for the bottom of the page. The richest of the three, still light."),
  ink: z.string().describe("Hex colour #rrggbb for text. Very dark; may be tinted toward the palette."),
  accent: z
    .string()
    .describe("Hex colour #rrggbb for the selected tab, with white text on it. Confident and dark enough for white text."),
  font: z.enum(THEME_FONTS),
  shape: z.enum(THEME_SHAPES).describe("Link button corners: round pills, soft rounded rectangles, or square-ish."),
  buttons: z
    .enum(THEME_BUTTONS)
    .describe("solid: white buttons with a soft shadow. outline: transparent with a thin ink border. frosted: see-through glass."),
  layout: z
    .enum(["keep", "tabs", "scroll"])
    .describe("'tabs' or 'scroll' only if the creator asked about layout; otherwise 'keep'."),
});

const SYSTEM_PROMPT = `You design the look of a creator's link-in-bio page on OrangeLink.

The page has a profile photo, name and bio at the top, then a column of link buttons and a small shop of product cards. You choose its look from a fixed menu: three background colours from top to bottom, a text colour, an accent colour for the selected Links/Shop tab, a font, a button shape and a button style.

Design rules:
- Backgrounds are always light. The page is built for dark text on a light ground, so even "dark" or "moody" requests become a light page with a deeper, richer bottom colour and darker ink. Keep the top close to white.
- Make it feel like the description. Pick colours that belong together; subtle beats loud.
- Text colour is near-black, tinted toward the palette if that suits it.
- The accent should be distinctive and dark enough for white text on it.
- Match the font and shapes to the mood: serif for editorial or elegant, rounded for playful or soft, mono for technical, condensed for bold or sporty, sans for clean or minimal.
- Only change the layout if the creator mentions tabs, one page, scrolling or similar.

If the description is empty, rude or unrelated to design, still return a tasteful neutral design.`;

const THEME_MODEL = process.env.PAGE_THEME_MODEL ?? "claude-opus-5";

export type ThemeLayout = "keep" | "tabs" | "scroll";

export type GenerateThemeResult =
  | { ok: true; theme: CustomTheme; layout: ThemeLayout }
  | { ok: false; error: string };

export function isThemeAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function generatePageTheme(description: string): Promise<GenerateThemeResult> {
  if (!isThemeAiConfigured()) {
    return { ok: false, error: "AI design isn't switched on for this site yet." };
  }

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: THEME_MODEL,
      max_tokens: 16000,
      // A short, low-stakes design choice: low effort keeps it quick, since
      // the creator is waiting on it.
      output_config: { effort: "low", format: betaZodOutputFormat(DesignSchema) },
      // If the request is declined, retry it on Anthropic's recommended
      // fallback model instead of failing the creator's click.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Design my page: ${description}` }],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "That description couldn't be turned into a design. Try describing colours or a mood." };
    }

    const design = response.parsed_output;
    const theme = design
      ? normalizeCustomTheme({
          name: design.name,
          gradient: [design.background_top, design.background_middle, design.background_bottom],
          ink: design.ink,
          accent: design.accent,
          font: design.font,
          shape: design.shape,
          buttons: design.buttons,
          prompt: description,
        })
      : null;

    if (!theme || !design) {
      return { ok: false, error: "The design didn't come back usable. Try again." };
    }
    return { ok: true, theme, layout: design.layout };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "AI design is busy right now. Try again in a minute." };
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "AI design isn't set up correctly on this site." };
    }
    if (error instanceof Anthropic.BadRequestError && /credit balance/i.test(error.message)) {
      return { ok: false, error: "AI design is unavailable: the site's AI account is out of credits." };
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return { ok: false, error: "Couldn't reach the AI service. Check your connection and try again." };
    }
    console.error("[page-theme] generation failed", error);
    return { ok: false, error: "Something went wrong designing that. Try again." };
  }
}
