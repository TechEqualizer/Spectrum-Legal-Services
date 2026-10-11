// The opening scene's recipe (docs/plans/06-opening-scene.md): how a link's
// opening cuts through its flyer, written by Claude when it reads the flyer.
// A few shots on the flyer's artwork, each with a camera move and maybe a
// line or two from the flyer set over it; then the whole flyer; then a calm
// hold that loops under the link's title. Played by src/remotion/OpeningScene.
//
// Recipes come from Claude and, later, back from browsers, so every value is
// checked here: boxes stay inside the flyer and big enough to stay sharp,
// moves and placements are from fixed lists, and words are short plain text.

export type Box = { x: number; y: number; w: number; h: number };
export const OPENING_MOVES = ["push", "pull", "tilt-up", "pan-left", "pan-right"] as const;
export type OpeningMove = (typeof OPENING_MOVES)[number];
export type OpeningText = { lines: string[]; at: "top" | "middle" | "bottom"; size: "eyebrow" | "big" };
export type OpeningBeat = { box: Box; move: OpeningMove; seconds: number; text?: OpeningText };
export type OpeningRecipe = {
  /** Two to four shots on the flyer's artwork; the whole flyer always follows them. */
  beats: OpeningBeat[];
  /** The calm shot the scene settles on, under the link's title. */
  hold: Box;
};

/** A shot narrower than this share of the flyer would be enlarged past its detail and look soft. */
export const MIN_SHOT_WIDTH = 0.28;
const MIN_SHOT_HEIGHT = 0.18;
const MIN_HOLD_WIDTH = 0.35;
const LINE_MAX = { big: 26, eyebrow: 34 } as const;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
// toFixed, not multiplying: rounding an already-rounded value must give it back exactly.
const round = (v: number, digits: number) => Number(v.toFixed(digits));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A box kept inside the flyer and at least the given size, around the same center. */
function cleanBox(v: unknown, minW: number, minH: number): Box | null {
  if (!isObject(v)) return null;
  const [x, y, w, h] = [num(v.x), num(v.y), num(v.w), num(v.h)];
  if (x === null || y === null || w === null || h === null || w <= 0 || h <= 0) return null;
  const cx = clamp(x + w / 2, 0, 1);
  const cy = clamp(y + h / 2, 0, 1);
  const W = round(clamp(w, minW, 1), 3);
  const H = round(clamp(h, minH, 1), 3);
  return { x: round(clamp(cx - W / 2, 0, 1 - W), 3), y: round(clamp(cy - H / 2, 0, 1 - H), 3), w: W, h: H };
}

/** One line of words: plain, single-spaced, within the size's limit. */
function cleanLine(v: unknown, max: number) {
  if (typeof v !== "string") return "";
  // Letters, numbers, spaces and ordinary punctuation only (no control or markup characters).
  const t = v.replace(/[\u0000-\u001f\u007f<>{}]/g, "").replace(/\s+/g, " ").trim();
  return t.length <= max ? t : "";
}

function cleanText(v: unknown): OpeningText | undefined {
  if (!isObject(v)) return undefined;
  const size = v.size === "eyebrow" ? "eyebrow" : v.size === "big" ? "big" : null;
  const at = v.at === "top" || v.at === "middle" || v.at === "bottom" ? v.at : null;
  if (!size || !at || !Array.isArray(v.lines)) return undefined;
  const lines = v.lines.map((l) => cleanLine(l, LINE_MAX[size])).filter(Boolean).slice(0, size === "eyebrow" ? 2 : 3);
  return lines.length ? { lines, at, size } : undefined;
}

/** A recipe cleaned to what the scene can play well, or null when too little of it is usable. */
export function parseOpening(v: unknown): OpeningRecipe | null {
  if (!isObject(v) || !Array.isArray(v.beats)) return null;
  const beats = v.beats.slice(0, 4).flatMap((b): OpeningBeat[] => {
    if (!isObject(b)) return [];
    const box = cleanBox(b.box, MIN_SHOT_WIDTH, MIN_SHOT_HEIGHT);
    const move = OPENING_MOVES.find((m) => m === b.move);
    if (!box || !move) return [];
    const seconds = round(clamp(num(b.seconds) ?? 1.7, 1.2, 2.6), 1);
    const text = cleanText(b.text);
    return [{ box, move, seconds, ...(text ? { text } : {}) }];
  });
  const hold = cleanBox(v.hold, MIN_HOLD_WIDTH, MIN_SHOT_HEIGHT);
  if (beats.length < 2 || !hold) return null;
  return { beats, hold };
}

const same = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => same(a[k], b[k]));
  }
  return a === b;
};

/** What's wrong with a stored recipe: it must already be exactly what parseOpening makes of it. */
export function checkOpening(v: unknown): string | null {
  const clean = parseOpening(v);
  return clean && same(clean, v) ? null : "bad opening scene";
}
