// Chart colors and helpers for the admin. Categorical slots come from the
// validated reference palette (dataviz skill), checked with
// validate_palette.js: all checks pass; aqua is under 3:1 on white, so the
// outcome chart always carries a legend, direct labels, and a table view.
// The admin's brand blue (#28719A) fails the chroma floor as a data color, so
// it stays in the UI chrome and the charts use slot 1 instead.

export const viz = {
  surface: "#ffffff",
  grid: "#e8e8e4",
  axis: "#d4d3cf",
  textPrimary: "#0b0b0b",
  textSecondary: "#52514e",
  textMuted: "#7a7975",
  series1: "#2a78d6", // blue
  series2: "#eb6834", // orange
  series3: "#1baf7a", // aqua
};

/** Ink for a label sitting inside a filled mark. */
export function labelInk(fill: string) {
  const h = fill.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Pick whichever of white / ink has the higher contrast.
  return (1.05 / (l + 0.05) > (l + 0.05) / 0.05 ? "#ffffff" : viz.textPrimary);
}

export const formatNumber = (n: number) =>
  n >= 10000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString("en-US");

/** A share as a percent; a share of nothing (0/0) shows as a dash, never "NaN%". */
export const formatPercent = (n: number) => (Number.isFinite(n) ? `${(n * 100).toFixed(0)}%` : "\u2013");

// Pinned to one time zone so server and browser render the same text.
export const FIRM_TIME_ZONE = "America/Los_Angeles";

export const formatDay = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: FIRM_TIME_ZONE });

/** Round a max value up to a clean axis ceiling and return its ticks. */
export function niceTicks(max: number, count = 4) {
  const raw = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw || 1));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ??
    10 * magnitude;
  const ticks = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}
