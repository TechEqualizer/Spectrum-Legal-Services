// A reel's cut from the flyer (src/lib/opening.ts, parseCut): cleaned like an
// opening, in the opening's mood, its words off the bottom (the reel's title
// and Tickets button live there), ending on the whole flyer.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { checkOpening, parseCut } from "@/lib/opening";
import { checkMedia } from "@/lib/publication";
import { cleanDraft } from "@/lib/server/funnel-draft";

const beat = (over: Record<string, unknown> = {}) => ({ box: { x: 0.2, y: 0.1, w: 0.4, h: 0.4 }, move: "push", seconds: 1.8, ...over });

test("a cut takes the opening's mood and ends on the whole flyer", () => {
  const c = parseCut({ beats: [beat({ text: { lines: ["You, in gold."], at: "top", size: "big" } }), beat({ move: "pan-left" })] }, "electric");
  assert.ok(c);
  assert.equal(c.mood, "electric");
  assert.deepEqual(c.hold, { x: 0, y: 0, w: 1, h: 1 });
  assert.equal(checkOpening(c), null);
});

test("words at the bottom move to the middle: the reel's title and Tickets are there", () => {
  const c = parseCut({ beats: [beat({ text: { lines: ["Oct 31"], at: "bottom", size: "big" } }), beat()] });
  assert.equal(c?.beats[0].text?.at, "middle");
});

test("a cut with too little to play is dropped (the reel keeps the still flyer)", () => {
  assert.equal(parseCut({ beats: [beat()] }), null);
  assert.equal(parseCut({ beats: [beat({ move: "spin" }), beat({ move: "spin" })] }), null);
  assert.equal(parseCut(null), null);
  assert.equal(parseCut("cut"), null);
});

test("a reel's photo may carry a clean cut, never a doctored one", () => {
  const cut = parseCut({ beats: [beat(), beat({ move: "pull" })] }, "glamour");
  assert.equal(checkMedia({ kind: "image", src: "/flyer.jpg", cut }), null);
  assert.equal(checkMedia({ kind: "image", src: "/flyer.jpg", cut: { ...cut, beats: [{ ...cut!.beats[0], box: { x: 0, y: 0, w: 0.01, h: 0.01 } }, cut!.beats[1]] } }), "bad flyer cut");
});

test("the draft keeps each reel's cut, in the opening's mood", () => {
  const reel = (role: string, cut: unknown) => ({ role, title: role, summary: "", hook: "", captions: [], date: null, source: "text", camera: "", seconds: 6, prompt: "", cut });
  const d = cleanDraft({
    screen: {},
    opening: { mood: "sunlit", beats: [beat(), beat({ move: "pull" })], hold: { x: 0.2, y: 0.4, w: 0.5, h: 0.5 } },
    reels: [reel("the_night", { beats: [beat(), beat({ move: "tilt-up" })] }), reel("your_people", { beats: [beat()] }), reel("last_call", { beats: [beat({ text: { lines: ["Sat, Nov 22"], at: "bottom", size: "big" } }), beat({ move: "pull" })] })],
  });
  assert.ok(!("problem" in d));
  const [night, people, last] = d.reels;
  assert.equal(night.cut?.mood, "sunlit");
  assert.equal(people.cut, undefined);
  assert.equal(last.cut?.beats[0].text?.at, "middle");
});
