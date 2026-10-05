// A funnel's look: its five brand colors and the title's typeface. Read from
// an event flyer, adjusted so every pairing the funnel uses stays readable,
// and published with the rest of the admin's edits.
//
// The five colors are the theme tokens the whole app is built on (see
// FunnelTheme): their names come from the law firm site, their roles are:
//   --deep-navy    the dark background behind everything
//   --royal-blue   a deeper mid tone (gradients, hovers)
//   --teal-accent  the main buttons, with white text
//   --sky-accent   highlights on the dark background (eyebrows, "Few left")
//   --soft-gray    light sheets and forms, with dark text

import type { FunnelTheme } from "@/data/funnel-types";

export const LOOK_ROLES = ["--deep-navy", "--royal-blue", "--teal-accent", "--sky-accent", "--soft-gray"] as const;
export type LookRole = (typeof LOOK_ROLES)[number];
export type LookColors = Record<LookRole, string>;

/** Title typefaces a look can use: a short, vetted list (see src/components/lookFonts.ts). */
export const LOOK_FONTS = {
  classic: { label: "Classic serif", hint: "warm, timeless" },
  editorial: { label: "Fashion serif", hint: "runway, gala, magazine" },
  regal: { label: "Engraved capitals", hint: "masquerade, black tie, luxury" },
  bold: { label: "Bold condensed", hint: "club night, festival, sports" },
  modern: { label: "Modern sans", hint: "tech, art, minimal" },
} as const;
export type LookFont = keyof typeof LOOK_FONTS;
export const LOOK_FONT_IDS = Object.keys(LOOK_FONTS) as LookFont[];

/**
 * The effect on the opening screen's main button (Tickets or Sneak peek),
 * in the highlight color. Shimmer is the original: a sweep of light.
 */
export const BUTTON_EFFECTS = {
  shimmer: { label: "Shimmer", hint: "A sweep of light" },
  glow: { label: "Glow", hint: "A breathing halo" },
  edge: { label: "Edge light", hint: "Light around the edge" },
} as const;
export type ButtonEffectStyle = keyof typeof BUTTON_EFFECTS;
export const BUTTON_EFFECT_IDS = Object.keys(BUTTON_EFFECTS) as ButtonEffectStyle[];
export type ButtonEffect = { style: ButtonEffectStyle; strength: "subtle" | "bold" };
export const DEFAULT_EFFECT: ButtonEffect = { style: "shimmer", strength: "subtle" };

/** The effect that suits each flyer suggestion, so most people never have to choose. */
export const SUGGESTION_EFFECTS: Record<string, ButtonEffectStyle> = { "True to flyer": "shimmer", Bold: "glow", Elegant: "edge" };

/** A button effect from untrusted input, or undefined. */
export function parseEffect(input: unknown): ButtonEffect | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const { style, strength } = input as Record<string, unknown>;
  return typeof style === "string" && style in BUTTON_EFFECTS && (strength === "subtle" || strength === "bold")
    ? { style: style as ButtonEffectStyle, strength }
    : undefined;
}

/** A ready-made combination from the flyer ("True to flyer", "Bold", "Elegant"). */
export type LookSuggestion = { label: string; colors: LookColors; font: LookFont };

export type Look = {
  colors: LookColors;
  font: LookFont;
  /** The flyer's own colors, for remixing in the Style sheet. */
  palette?: string[];
  /** Ready-made combinations from the flyer, the first one true to it. */
  suggestions?: LookSuggestion[];
  /** The flyer itself (an upload or public link), for the background choices. */
  flyer?: string;
  /** The main button's effect; without it, a subtle shimmer. */
  effect?: ButtonEffect;
};

const HEX = /^#[0-9a-f]{6}$/i;

type RGB = [number, number, number];
const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = (rgb: RGB) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;

/** WCAG relative luminance. */
function luminance([r, g, b]: RGB) {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two colors. */
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(toRgb(a)), luminance(toRgb(b))].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
/** The dark text on light sheets (Tailwind's charcoal). */
const TEXT = "#1F2937";

/** Moves `color` toward `toward` in small steps until `ok`, keeping its hue as long as it can. */
function nudge(color: string, toward: RGB, ok: (hex: string) => boolean) {
  const start = toRgb(color);
  for (let t = 0; t <= 1.0001; t += 0.04) {
    const hex = toHex(mix(start, toward, t));
    if (ok(hex)) return hex;
  }
  return toHex(toward);
}

/**
 * The colors, adjusted so the funnel stays readable: white words on the
 * background and buttons, highlights that stand out on the background, and
 * dark text on light sheets. Flyers often get away with low contrast on
 * paper; a phone screen in the sun doesn't.
 */
export function readableColors(colors: LookColors): LookColors {
  const deep = nudge(colors["--deep-navy"], BLACK, (h) => contrast(h, "#FFFFFF") >= 13);
  const mid = nudge(colors["--royal-blue"], BLACK, (h) => contrast(h, "#FFFFFF") >= 7);
  // A light accent (gold, neon) keeps its color and gets dark words (see onAccent); a mid one darkens until white reads.
  const raw = colors["--teal-accent"];
  const accent = contrast(raw, deep) >= 4.5 && contrast(raw, "#FFFFFF") < 4.5 ? raw : nudge(raw, BLACK, (h) => contrast(h, "#FFFFFF") >= 4.5);
  const highlight = nudge(colors["--sky-accent"], WHITE, (h) => contrast(h, deep) >= 6);
  const light = nudge(colors["--soft-gray"], WHITE, (h) => contrast(h, TEXT) >= 11);
  return { "--deep-navy": deep, "--royal-blue": mid, "--teal-accent": accent, "--sky-accent": highlight, "--soft-gray": light };
}

function parseColors(input: unknown): LookColors | null {
  if (typeof input !== "object" || input === null) return null;
  const c = input as Record<string, unknown>;
  if (!LOOK_ROLES.every((role) => typeof c[role] === "string" && HEX.test(c[role] as string))) return null;
  return readableColors(Object.fromEntries(LOOK_ROLES.map((role) => [role, (c[role] as string).toUpperCase()])) as LookColors);
}
const isFont = (v: unknown): v is LookFont => typeof v === "string" && v in LOOK_FONTS;

/**
 * A look from untrusted input (a publish, or the model's answer), made
 * readable; null if it isn't one. `isUrl` checks the flyer's link; without
 * it the flyer is dropped.
 */
export function parseLook(input: unknown, isUrl?: (v: unknown) => boolean): Look | null {
  if (typeof input !== "object" || input === null) return null;
  const { colors: rawColors, font, palette, suggestions, flyer, effect } = input as Record<string, unknown>;
  const colors = parseColors(rawColors);
  if (!colors || !isFont(font)) return null;
  const look: Look = { colors, font };
  if (Array.isArray(palette)) {
    const swatches = [...new Set(palette.filter((c): c is string => typeof c === "string" && HEX.test(c)).map((c) => c.toUpperCase()))].slice(0, 10);
    if (swatches.length) look.palette = swatches;
  }
  if (Array.isArray(suggestions)) {
    const list = suggestions.slice(0, 4).flatMap((sg): LookSuggestion[] => {
      if (typeof sg !== "object" || sg === null) return [];
      const { label, colors: c, font: f } = sg as Record<string, unknown>;
      const parsed = parseColors(c);
      return typeof label === "string" && label.trim() && label.length <= 24 && parsed && isFont(f) ? [{ label: label.trim(), colors: parsed, font: f }] : [];
    });
    if (list.length) look.suggestions = list;
  }
  if (flyer !== undefined && isUrl?.(flyer)) look.flyer = flyer as string;
  const fx = parseEffect(effect);
  if (fx) look.effect = fx;
  return look;
}

// ---------------------------------------------------------------------------
// Remixing in the Style sheet: the admin picks three colors, the rest follow.

const saturation = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};
const lum = (hex: string) => luminance(toRgb(hex));

/**
 * Colors from three picks: the background, the buttons and the highlights.
 * The deeper tone is the background warmed toward the buttons; the light
 * sheets keep their tint. Then everything is made readable.
 */
export function composeColors(pick: { background: string; button: string; highlight: string }, base: LookColors): LookColors {
  const bg = toRgb(pick.background);
  return readableColors({
    "--deep-navy": pick.background,
    "--royal-blue": toHex(mix(mix(bg, toRgb(pick.button), 0.18), WHITE, 0.06)),
    "--teal-accent": pick.button,
    "--sky-accent": pick.highlight,
    "--soft-gray": base["--soft-gray"],
  });
}

/** Whether readableColors had to change a pick, so the sheet can say so. */
export const wasAdjusted = (picked: string, shown: string) => picked.toUpperCase() !== shown.toUpperCase();

/**
 * Another good combination from the flyer's colors: one of its darkest as
 * the background, one of its most vivid for the buttons, and a bright one
 * for highlights. `seed` picks which, so each tap of Shuffle differs.
 */
export function shuffleColors(palette: string[], base: LookColors, seed: number): LookColors {
  const byDark = [...palette].sort((a, b) => lum(a) - lum(b));
  const darks = byDark.slice(0, Math.max(2, Math.ceil(palette.length / 3)));
  const rest = palette.filter((c) => !darks.includes(c));
  const vivid = (rest.length ? rest : palette).sort((a, b) => saturation(b) - saturation(a)).slice(0, 3);
  const bright = [...palette].sort((a, b) => lum(b) * (0.5 + saturation(b)) - lum(a) * (0.5 + saturation(a))).slice(0, 3);
  const at = <T,>(list: T[], n: number) => list[((n % list.length) + list.length) % list.length];
  const background = at(darks, seed);
  const button = at(vivid, seed + Math.floor(seed / darks.length));
  const highlight = at(bright.filter((c) => c !== button).length ? bright.filter((c) => c !== button) : bright, seed + 1);
  return composeColors({ background, button, highlight }, base);
}

/** The words' color on a main button: white, or the dark background color on a light accent. */
export const onAccent = (colors: LookColors) =>
  contrast(colors["--teal-accent"], "#FFFFFF") >= 4.5 ? "#FFFFFF" : colors["--deep-navy"];

/** The theme a look gives a funnel. */
export const themeOf = (look: Look): FunnelTheme => ({ ...look.colors, "--on-accent": onAccent(look.colors), "--fx-color": effectColor(look.colors) });

/** The button effect's color: the highlight, or white when the highlight is too close to the button to show. */
export const effectColor = (colors: LookColors) => (contrast(colors["--sky-accent"], colors["--teal-accent"]) >= 1.6 ? colors["--sky-accent"] : "#FFFFFF");
