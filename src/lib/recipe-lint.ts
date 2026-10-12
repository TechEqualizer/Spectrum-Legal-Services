// Checks a drafted opening and reel cuts against the directing rules that used
// to live only in Claude's brief (.claude/skills/opening-scene, flyer-cuts;
// docs/plans/09-flyer-to-video.md, gap 2). Each problem is said plainly, so
// it can go back to Claude for one fix, and to the tests.

import type { Box, OpeningRecipe } from "@/lib/opening";
import type { ReelRole } from "@/lib/funnel-draft";

/** What Claude found on the flyer, in fractions: its subjects (faces, figures) and its lettering. */
export type FlyerMap = { subjects: { what: string; box: Box }[]; lettering: Box[] };

/** The facts a line may state: what the flyer and the known dates say. */
export type Facts = { dates: string[]; times: string[]; prices: string[]; statuses: string[] };

const area = (b: Box) => b.w * b.h;
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const iou = (a: Box, b: Box) => {
  const i = overlap(a, b);
  return i / (area(a) + area(b) - i);
};
const wordsOf = (lines: string[]) => lines.join(" ").split(/\s+/).filter(Boolean).length;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_DAY = new RegExp(`\\b(${MONTHS.join("|")})[a-z]*\\.?\\s+(\\d{1,2})(st|nd|rd|th)?\\b`, "gi");
const WEEKDAY = /\b(mon|tues?|wed(nes)?|thu(rs)?|fri|sat(ur)?|sun)(day)?\b/i;
const TIME = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi;
const PRICE = /\$\s?(\d+(?:\.\d{2})?)/g;
const FAKE_URGENCY = /\b(selling fast|going fast|almost gone|sold out|last few|nearly sold|only \d+ left)\b/i;

/** "8PM", "8:00 pm" → "20:00". */
const time24 = (h: string, m: string | undefined, ap: string) => `${String((Number(h) % 12) + (ap.toLowerCase() === "pm" ? 12 : 0)).padStart(2, "0")}:${m ?? "00"}`;

/** The facts in a line that the flyer and the known dates don't back. */
export function unbackedFacts(line: string, facts: Facts): string[] {
  const out: string[] = [];
  for (const m of line.matchAll(PRICE)) {
    const n = Number(m[1]);
    if (!facts.prices.some((p) => [...p.matchAll(/\d+(?:\.\d{2})?/g)].some((x) => Number(x[0]) === n))) out.push(m[0]);
  }
  for (const m of line.matchAll(TIME)) {
    if (!facts.times.includes(time24(m[1], m[2], m[3]))) out.push(m[0]);
  }
  for (const m of line.matchAll(MONTH_DAY)) {
    const month = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1;
    const day = Number(m[2]);
    if (!facts.dates.some((d) => Number(d.slice(5, 7)) === month && Number(d.slice(8, 10)) === day)) out.push(m[0]);
  }
  const urgent = line.match(FAKE_URGENCY);
  if (urgent && !(/sold out/i.test(urgent[0]) ? facts.statuses.includes("sold_out") : facts.statuses.includes("few_left"))) out.push(urgent[0]);
  return out;
}

type Named = { name: string; recipe: OpeningRecipe; role?: ReelRole };

/**
 * Every rule a draft breaks, in words Claude can act on. Empty when it's
 * clean. `opening` is the opening's recipe; `cuts`, the reels' cuts; `facts`,
 * what lines may state (an opening alone copies the flyer, so has none).
 */
export function lintRecipes({ opening, cuts, map, facts }: { opening?: OpeningRecipe; cuts: { role: ReelRole; cut: OpeningRecipe }[]; map?: FlyerMap; facts?: Facts }): string[] {
  const problems: string[] = [];
  const all: Named[] = [
    ...(opening ? [{ name: "the opening", recipe: opening }] : []),
    ...cuts.map((c) => ({ name: `the ${c.role} cut`, recipe: c.cut, role: c.role })),
  ];
  for (const { name, recipe, role } of all) {
    recipe.beats.forEach((b, i) => {
      const shot = `${name}, shot ${i + 1}`;
      if (i > 0 && b.move === recipe.beats[i - 1].move) problems.push(`${shot} repeats the previous shot's move (${b.move}); use a different move.`);
      for (const l of map?.lettering ?? []) {
        if (overlap(b.box, l) / area(b.box) > 0.12) {
          problems.push(`${shot} shows the flyer's own lettering; move or shrink its box onto the artwork.`);
          break;
        }
      }
      if (b.text?.size === "big" && wordsOf(b.text.lines) > 5) problems.push(`${shot} has ${wordsOf(b.text.lines)} words; five at most.`);
      for (const line of facts ? (b.text?.lines ?? []) : []) {
        const bad = unbackedFacts(line, facts!);
        if (bad.length) problems.push(`${shot} says "${bad.join('", "')}", which the flyer and the known dates don't say; use only facts they state.`);
      }
    });
    if (role === "the_night") {
      const first = recipe.beats[0].text;
      const n = first ? wordsOf(first.lines) : 0;
      if (first?.size !== "big" || n < 2 || n > 4) problems.push(`${name} must open on its hook: a big line of two to four words on its first shot.`);
    }
    if (role === "last_call") {
      const worded = recipe.beats.filter((b) => b.text);
      const dated = (b: (typeof worded)[number]) => b.text!.lines.some((l) => WEEKDAY.test(l) || new RegExp(MONTH_DAY.source, "i").test(l));
      if (worded.some(dated) && !dated(worded[worded.length - 1])) problems.push(`${name} must say the date last, right before the whole flyer.`);
    }
  }
  // The same shot twice, across the opening and the cuts, unless the later one is closer.
  for (let a = 0; a < all.length; a++)
    for (let b = a + 1; b < all.length; b++)
      all[a].recipe.beats.forEach((x, i) =>
        all[b].recipe.beats.forEach((y, j) => {
          if (iou(x.box, y.box) > 0.6 && area(y.box) > area(x.box) * 0.75)
            problems.push(`${all[b].name}, shot ${j + 1} repeats ${all[a].name}, shot ${i + 1}; frame it closer or choose another subject.`);
        }),
      );
  return problems;
}
