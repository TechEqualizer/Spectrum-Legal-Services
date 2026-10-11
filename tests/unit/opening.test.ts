// The opening scene's recipe (src/lib/opening.ts): what Claude writes is
// cleaned to what plays well, and what comes back from a browser must be
// exactly a clean recipe.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { checkOpening, MIN_SHOT_WIDTH, parseOpening } from "@/lib/opening";

const beat = (over: Record<string, unknown> = {}) => ({ box: { x: 0.69, y: 0.02, w: 0.31, h: 0.37 }, move: "pull", seconds: 2, ...over });
const recipe = (beats: unknown[], hold: unknown = { x: 0.3, y: 0.5, w: 0.4, h: 0.4 }) => ({ beats, hold });

test("a good recipe comes through as written", () => {
  const r = parseOpening(recipe([beat({ text: { lines: ["Big Love Productions", "presents"], at: "bottom", size: "eyebrow" } }), beat({ move: "tilt-up", text: { lines: ["Masks on."], at: "bottom", size: "big" } })]));
  assert.ok(r);
  assert.equal(r.beats.length, 2);
  assert.deepEqual(r.beats[0].text, { lines: ["Big Love Productions", "presents"], at: "bottom", size: "eyebrow" });
  assert.equal(checkOpening(r), null);
});

test("shots too small to stay sharp are widened around the same center, inside the flyer", () => {
  const r = parseOpening(recipe([beat({ box: { x: 0.9, y: 0.95, w: 0.05, h: 0.02 } }), beat()]));
  assert.ok(r);
  const b = r.beats[0].box;
  assert.ok(b.w >= MIN_SHOT_WIDTH && b.x + b.w <= 1 && b.y + b.h <= 1 && b.x >= 0 && b.y >= 0, JSON.stringify(b));
});

test("unknown moves, placements and too few shots are refused", () => {
  assert.equal(parseOpening(recipe([beat({ move: "spin" }), beat()])), null);
  assert.equal(parseOpening(recipe([beat()])), null);
  assert.equal(parseOpening(recipe([beat(), beat()], null)), null);
  const r = parseOpening(recipe([beat({ text: { lines: ["Hi"], at: "sideways", size: "big" } }), beat()]));
  assert.ok(r && !r.beats[0].text);
});

test("words are short plain text: long lines and markup are dropped", () => {
  const r = parseOpening(recipe([beat({ text: { lines: ["<b>Masks</b> on", "A line far too long to fit over a shot on a phone"], at: "top", size: "big" } }), beat()]));
  assert.ok(r);
  assert.deepEqual(r.beats[0].text?.lines, ["bMasks/b on"]);
});

test("a cleaned recipe cleans to itself (so stored ones pass the check), even at the edges", () => {
  for (let i = 0; i < 500; i++) {
    const rnd = () => Math.random() * 1.2 - 0.1;
    const r = parseOpening(recipe([beat({ box: { x: rnd(), y: rnd(), w: Math.random(), h: Math.random() } }), beat({ seconds: Math.random() * 5 })], { x: rnd(), y: rnd(), w: Math.random(), h: Math.random() }));
    if (!r) continue;
    assert.equal(checkOpening(r), null, JSON.stringify(r));
  }
});

test("a stored recipe with anything changed or added is refused", () => {
  const r = parseOpening(recipe([beat(), beat()]))!;
  assert.equal(checkOpening({ ...r, extra: 1 }), "bad opening scene");
  assert.equal(checkOpening({ ...r, beats: [{ ...r.beats[0], box: { ...r.beats[0].box, w: 0.01 } }, r.beats[1]] }), "bad opening scene");
});
