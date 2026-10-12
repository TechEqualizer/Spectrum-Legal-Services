// A flyer's depth map (docs/plans/09-flyer-to-video.md, phase 2): the model's
// input and output, kept as plain math so it can be checked without the model,
// and the map's way from the wizard to the claimed link.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { toGray, toInput, workingSize } from "@/lib/depth-map";
import { checkMedia } from "@/lib/publication";
import { depthBytes } from "@/lib/server/flyer-store";
import { claimPublication, draftLink, type StartDraft } from "@/lib/start-draft";

test("the model works at a short side of 518, both sides multiples of its 14-pixel patches", () => {
  assert.deepEqual(workingSize(1054, 1492), { w: 518, h: 728 });
  assert.deepEqual(workingSize(1600, 900), { w: 924, h: 518 });
  assert.deepEqual(workingSize(800, 800), { w: 518, h: 518 });
  const s = workingSize(1123, 1401);
  assert.ok(s.w % 14 === 0 && s.h % 14 === 0 && Math.min(s.w, s.h) === 518, JSON.stringify(s));
});

test("pixels go in as ImageNet-normalized RGB planes", () => {
  const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
  const x = toInput(rgba, 2, 1);
  assert.equal(x.length, 6);
  assert.ok(Math.abs(x[0] - (1 - 0.485) / 0.229) < 1e-5 && Math.abs(x[1] - (0 - 0.485) / 0.229) < 1e-5);
  assert.ok(Math.abs(x[3] - (1 - 0.456) / 0.224) < 1e-5 && Math.abs(x[2] - (0 - 0.456) / 0.224) < 1e-5);
});

test("the model's relative depth comes out as gray, stretched from 0 to 255 (bright is near)", () => {
  assert.deepEqual([...toGray(new Float32Array([2, 4, 6]))], [0, 128, 255]);
  assert.deepEqual([...toGray(new Float32Array([3, 3]))], [0, 0]);
});

test("only a real, small PNG is stored as a depth map", () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);
  assert.ok(depthBytes(`data:image/png;base64,${png.toString("base64")}`));
  assert.equal(depthBytes(`data:image/jpeg;base64,${png.toString("base64")}`), null);
  assert.equal(depthBytes(`data:image/png;base64,${Buffer.from("not a png at all").toString("base64")}`), null);
  assert.equal(depthBytes(`data:image/png;base64,${Buffer.concat([png, Buffer.alloc(1024 * 1024)]).toString("base64")}`), null);
});

test("the depth map plays in the wizard's phone, and goes on the claimed link only once stored", () => {
  const cut = { beats: [{ box: { x: 0.2, y: 0.1, w: 0.4, h: 0.4 }, move: "push" as const, seconds: 1.8 }, { box: { x: 0.3, y: 0.5, w: 0.4, h: 0.4 }, move: "pull" as const, seconds: 1.8 }], hold: { x: 0, y: 0, w: 1, h: 1 } };
  const d: StartDraft = {
    flyer: "data:image/jpeg;base64,/9j/",
    depth: "data:image/png;base64,iVBORw0KGgo=",
    dates: [{ name: "Golden Hour", date: "2026-10-31", time: "20:00", venue: "", price: "", ticketUrl: "https://posh.vip/e/gh" }],
    reels: { screen: { title: "", tagline: "", watchLabel: "", heading: "" }, heroPrompt: "", reels: [{ role: "the_night", title: "Night", summary: "", hook: "", captions: [], source: "text", videoPrompt: "", cut }] },
  };
  const preview = draftLink(d, { core: true }).publication;
  assert.equal(preview.reels[0].media?.kind === "image" && preview.reels[0].media.depth, d.depth);
  const flyer = "https://x.supabase.co/storage/v1/object/public/reel-media/night/a-flyer.jpg";
  const depth = "https://x.supabase.co/storage/v1/object/public/reel-media/night/a-depth.png";
  const claimed = claimPublication(d, undefined, undefined, flyer, depth);
  assert.equal(claimed.reels[0].media?.kind === "image" && claimed.reels[0].media.depth, depth);
  assert.equal(claimed.backdrop?.kind === "image" && claimed.backdrop.depth, depth);
  assert.ok(claimed.reels.every((r) => checkMedia(r.media) === null));
  // Not stored: no depth on the link (never a data URL).
  const without = claimPublication(d, undefined, undefined, flyer);
  assert.ok(!JSON.stringify(without).includes("data:image/png"));
});
