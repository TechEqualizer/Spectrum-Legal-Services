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

export type Look = { colors: LookColors; font: LookFont };

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

/** A look from untrusted input (a publish, or the model's answer), made readable; null if it isn't one. */
export function parseLook(input: unknown): Look | null {
  if (typeof input !== "object" || input === null) return null;
  const { colors, font } = input as { colors?: unknown; font?: unknown };
  if (typeof colors !== "object" || colors === null) return null;
  const c = colors as Record<string, unknown>;
  if (!LOOK_ROLES.every((role) => typeof c[role] === "string" && HEX.test(c[role] as string))) return null;
  if (typeof font !== "string" || !(font in LOOK_FONTS)) return null;
  const picked = Object.fromEntries(LOOK_ROLES.map((role) => [role, (c[role] as string).toUpperCase()])) as LookColors;
  return { colors: readableColors(picked), font: font as LookFont };
}

/** The words' color on a main button: white, or the dark background color on a light accent. */
export const onAccent = (colors: LookColors) =>
  contrast(colors["--teal-accent"], "#FFFFFF") >= 4.5 ? "#FFFFFF" : colors["--deep-navy"];

/** The theme a look gives a funnel. */
export const themeOf = (look: Look): FunnelTheme => ({ ...look.colors, "--on-accent": onAccent(look.colors) });
