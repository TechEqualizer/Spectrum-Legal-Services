// The director measures and checks its work (docs/plans/09-flyer-to-video.md,
// gaps 1 and 2): the flyer's size read from its bytes, boxes in pixels turned
// into fractions, and the directing rules checked in code.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { base64ImageSize, imageSize } from "@/lib/image-size";
import { boxFromPixels, parseCut, parseOpening } from "@/lib/opening";
import { lintRecipes, unbackedFacts, type Facts } from "@/lib/recipe-lint";
import { cleanDraft, draftProblems } from "@/lib/server/funnel-draft";

test("a flyer's size comes from its own bytes: JPEG, PNG, GIF, WebP", () => {
  const jpg = readFileSync("tests/e2e/fixtures/flyer-masquerade.jpg");
  assert.deepEqual(imageSize(new Uint8Array(jpg)), { w: 800, h: 1000 });
  assert.deepEqual(base64ImageSize(jpg.toString("base64")), { w: 800, h: 1000 });
  const png = new Uint8Array(32);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0x04, 0x38, 0, 0, 0x07, 0x80]);
  assert.deepEqual(imageSize(png), { w: 1080, h: 1920 });
  const gif = new Uint8Array(32);
  gif.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x20, 0x03, 0x58, 0x02]);
  assert.deepEqual(imageSize(gif), { w: 800, h: 600 });
  assert.equal(imageSize(new Uint8Array(40)), null);
  assert.equal(base64ImageSize("not an image"), null);
});

test("boxes Claude gives in pixels become fractions of the flyer, corners in any order, kept inside it", () => {
  assert.deepEqual(boxFromPixels({ x1: 200, y1: 250, x2: 600, y2: 750 }, { w: 800, h: 1000 }), { x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
  assert.deepEqual(boxFromPixels({ x1: 600, y1: 750, x2: 200, y2: 250 }, { w: 800, h: 1000 }), { x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
  assert.deepEqual(boxFromPixels({ x1: -50, y1: 0, x2: 900, y2: 1000 }, { w: 800, h: 1000 }), { x: 0, y: 0, w: 1, h: 1 });
  assert.equal(boxFromPixels({ x1: 10, y1: 10, x2: 10, y2: 50 }, { w: 800, h: 1000 }), null);
  assert.equal(boxFromPixels({ x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, { w: 800, h: 1000 }), null);
});

test("a shot keeps its focus (the face it's about), small as it is", () => {
  const r = parseOpening({ beats: [{ box: { x: 0.5, y: 0, w: 0.4, h: 0.4 }, move: "push", seconds: 2, focus: { x: 0.7, y: 0.1, w: 0.05, h: 0.05 } }, { box: { x: 0, y: 0.5, w: 0.4, h: 0.4 }, move: "pull", seconds: 2 }], hold: { x: 0.3, y: 0.3, w: 0.4, h: 0.4 } });
  assert.deepEqual(r?.beats[0].focus, { x: 0.7, y: 0.1, w: 0.05, h: 0.05 });
  assert.equal(r?.beats[1].focus, undefined);
});

const facts: Facts = { dates: ["2026-10-31"], times: ["20:00"], prices: ["From $30"], statuses: [] };

test("a line may only state facts the flyer and the known dates state", () => {
  assert.deepEqual(unbackedFacts("Saturday, Oct 31", facts), []);
  assert.deepEqual(unbackedFacts("Doors 8PM", facts), []);
  assert.deepEqual(unbackedFacts("From $30", facts), []);
  assert.deepEqual(unbackedFacts("$31 GA", facts), ["$31"]);
  assert.deepEqual(unbackedFacts("Nov 1, 9pm", facts), ["9pm", "Nov 1"]);
  assert.deepEqual(unbackedFacts("Selling fast", facts), ["Selling fast"]);
  assert.deepEqual(unbackedFacts("Selling fast", { ...facts, statuses: ["few_left"] }), []);
});

const beat = (x: number, y: number, move: string, line?: string, size = "big") => ({ box: { x, y, w: 0.34, h: 0.36 }, move, seconds: 1.8, ...(line ? { text: { lines: [line], at: "top", size } } : {}) });

test("the lint names every broken directing rule", () => {
  const night = parseCut({ beats: [beat(0.6, 0, "push", "You are all mine at night"), beat(0.6, 0.3, "push")] }, "glamour")!;
  const last = parseCut({ beats: [beat(0.1, 0.5, "push", "Saturday, Oct 31"), beat(0.1, 0.1, "pull", "Limited tickets")] }, "glamour", "last_call")!;
  const people = parseCut({ beats: [beat(0.6, 0, "pan-left", "$31 GA"), beat(0.3, 0.6, "pull")] }, "glamour", "your_people")!;
  const problems = lintRecipes({
    cuts: [{ role: "the_night", cut: night }, { role: "your_people", cut: people }, { role: "last_call", cut: last }],
    map: { subjects: [], lettering: [{ x: 0.6, y: 0.3, w: 0.4, h: 0.1 }] },
    facts,
  });
  const has = (re: RegExp) => problems.some((p) => re.test(p));
  assert.ok(has(/the_night cut, shot 2 repeats the previous shot's move/), problems.join("\n"));
  assert.ok(has(/the_night cut, shot 2 shows the flyer's own lettering/));
  assert.ok(has(/the_night cut, shot 1 has 6 words/));
  assert.ok(has(/the_night cut must open on its hook/));
  assert.ok(has(/your_people cut, shot 1 says "\$31"/));
  assert.ok(has(/the_night cut, shot 1 repeats|your_people cut, shot 1 repeats the the_night cut, shot 1/));
  assert.ok(has(/last_call cut must say the date last/));
});

test("a clean draft passes the lint", () => {
  const night = parseCut({ beats: [beat(0.6, 0, "push", "You, behind the mask"), beat(0.3, 0.55, "tilt-up", "Own the runway")] }, "glamour")!;
  const last = parseCut({ beats: [beat(0, 0.2, "push", "Limited tickets"), beat(0.62, 0.62, "pull", "Saturday, Oct 31")] }, "glamour", "last_call")!;
  assert.deepEqual(lintRecipes({ cuts: [{ role: "the_night", cut: night }, { role: "last_call", cut: last }], map: { subjects: [], lettering: [{ x: 0, y: 0.95, w: 1, h: 0.05 }] }, facts }), []);
});

test("a draft written in pixels comes back in fractions, and its problems are named for the fix", () => {
  const px = { w: 800, h: 1000 };
  const pb = (x: number, y: number) => ({ x1: x, y1: y, x2: x + 280, y2: y + 360 });
  const reel = (role: string, beats: unknown[]) => ({ role, title: role, summary: "", hook: "", captions: [], date: null, source: "text", camera: "", seconds: 6, prompt: "", cut: { beats } });
  const raw = {
    screen: {},
    map: { subjects: [], lettering: [{ x1: 0, y1: 940, x2: 800, y2: 1000 }] },
    opening: { mood: "glamour", beats: [{ box: pb(480, 0), move: "push", seconds: 2, focus: { x1: 560, y1: 80, x2: 640, y2: 160 }, text: { lines: ["Masks on."], at: "bottom", size: "big" } }, { box: pb(0, 500), move: "pull", seconds: 2, focus: pb(100, 600) }], hold: { x1: 200, y1: 300, x2: 600, y2: 800 } },
    reels: [reel("the_night", [{ box: pb(480, 0), move: "push", seconds: 2, text: { lines: ["A line far too long for any shot"], at: "top", size: "big" } }, { box: pb(240, 300), move: "pull", seconds: 2 }])],
  };
  const d = cleanDraft(raw, px);
  assert.ok(!("problem" in d));
  assert.deepEqual(d.opening?.beats[0].box, { x: 0.6, y: 0, w: 0.35, h: 0.36 });
  assert.deepEqual(d.opening?.beats[0].focus, { x: 0.7, y: 0.08, w: 0.1, h: 0.08 });
  assert.deepEqual(d.opening?.hold, { x: 0.25, y: 0.3, w: 0.5, h: 0.5 });
  const problems = draftProblems(raw, d, px, facts);
  assert.ok(problems.some((p) => /"A line far too long for any shot" is longer than 26 characters/.test(p)), problems.join("\n"));
  assert.ok(problems.some((p) => /the_night cut, shot 1 repeats the opening, shot 1/.test(p)));
});
