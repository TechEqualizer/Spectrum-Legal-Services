// The sign-up wizard's draft link (src/lib/start-draft.ts): what the phone
// shows at each step. Only what going live gives: no Fans add-on extras
// (Follow, presales, fans-only reels) in the preview.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseOpening } from "@/lib/opening";
import { applyPublication, checkMedia } from "@/lib/publication";
import { basicReels, claimPublication, draftLink, httpsLink, needsTicketLink, suggestedName, type StartDraft } from "@/lib/start-draft";

const date = (d: string, extra: Partial<NonNullable<StartDraft["dates"]>[number]> = {}) => ({
  name: "Golden Hour",
  date: d,
  time: "21:00",
  venue: "The Rooftop",
  price: "From $30",
  ticketUrl: "",
  ...extra,
});
const draft: StartDraft = { role: "Venue", flyer: "data:image/jpeg;base64,AAAA", dates: [date("2026-10-31"), date("2026-11-08", { name: "Golden Hour II" })] };

test("step 1: the night and its dates, no Fans extras", () => {
  const { funnel, publication } = draftLink(draft);
  const shown = applyPublication(funnel, publication);
  assert.equal(shown.cover.hero?.title, "Golden Hour");
  assert.equal(shown.events?.length, 2);
  assert.ok(!shown.events?.some((e) => e.presale));
  assert.ok(!shown.reels.some((r) => r.visibility === "fans"));
});

test("step 2: three reels in order over the flyer, and nothing for followers", () => {
  const { funnel, publication } = draftLink(draft, { core: true });
  const shown = applyPublication(funnel, publication);
  assert.deepEqual(shown.reels.map((r) => r.role ?? r.id), ["the_night", "your_people", "last_call"]);
  assert.ok(shown.reels.every((r) => r.media?.kind === "image" && r.eventId === "night-1"));
  assert.ok(!shown.reels.some((r) => r.visibility === "fans"));
});

test("step 2: drafted words, and each reel sells its own date", () => {
  const reels = basicReels(draft);
  reels.screen.title = "Masks on";
  reels.reels[2] = { ...reels.reels[2], title: "Last call", date: "2026-11-08" };
  const { funnel, publication } = draftLink({ ...draft, reels }, { core: true });
  const shown = applyPublication(funnel, publication);
  assert.equal(shown.cover.hero?.title, "Masks on");
  assert.equal(shown.reels.find((r) => r.role === "last_call")?.eventId, "night-2");
});

test("step 2: no presale in the preview (it's part of the Fans add-on)", () => {
  const { publication } = draftLink(draft, { core: true });
  assert.ok(!publication.events?.some((e) => e.presale));
});

test("the basics: true to the flyer, nothing invented", () => {
  const r = basicReels(draft);
  assert.equal(r.screen.title, "Golden Hour");
  assert.match(r.screen.tagline, /The Rooftop/);
  assert.deepEqual(r.reels.map((x) => x.role), ["the_night", "your_people", "last_call"]);
  assert.match(r.reels[2].summary, /From \$30/);
});

test("the claim publishes the words and dates, not the preview's extras", () => {
  const pub = claimPublication(draft, "America/Detroit", "https://posh.vip/e/gh");
  assert.deepEqual(pub.reels.map((r) => r.role), ["the_night", "your_people", "last_call"]);
  assert.deepEqual(pub.funnel.order, pub.reels.map((r) => r.id));
  assert.equal(pub.backdrop, undefined);
  assert.ok(pub.reels.every((r) => !r.media));
  assert.equal(pub.events?.length, 2);
  assert.ok(pub.events.every((e) => !e.presale && e.timeZone === "America/Detroit"));
});

test("the claim: a date without a ticket link borrows one, or is left off", () => {
  const one = { ...draft, dates: [date("2026-10-31", { ticketUrl: "eventbrite.com/e/123" }), date("2026-11-08")] };
  assert.deepEqual(claimPublication(one).events?.map((e) => e.ticketUrl), ["https://eventbrite.com/e/123", "https://eventbrite.com/e/123"]);
  assert.deepEqual(claimPublication(draft, undefined, "https://posh.vip/e/gh").events?.map((e) => e.ticketUrl), ["https://posh.vip/e/gh", "https://posh.vip/e/gh"]);
  assert.equal(claimPublication(draft).events, undefined);
  assert.equal(needsTicketLink(draft), true);
  assert.equal(needsTicketLink(one), false);
});

test("ticket links: https only", () => {
  assert.equal(httpsLink("dice.fm/event/x"), "https://dice.fm/event/x");
  assert.equal(httpsLink("http://example.com"), "");
  assert.equal(httpsLink("javascript:alert(1)"), "");
  assert.equal(httpsLink("tickets"), "");
});

test("the name to suggest: before the colon", () => {
  assert.equal(suggestedName({ dates: [date("2026-10-31", { name: "Golden Hour: Halloween" })] }), "Golden Hour");
  assert.equal(suggestedName({}), "");
});

test("the claim, with the flyer stored: the opening scene, behind each reel, and the look's flyer", () => {
  const flyer = "https://example.supabase.co/storage/v1/object/public/reel-media/night/abc-flyer.jpg";
  const look = { colors: { background: "#000000", depth: "#111111", button: "#d4af37", highlight: "#8a6d1f", light: "#ffffff" }, font: "regal" } as unknown as NonNullable<StartDraft["look"]>;
  const pub = claimPublication({ ...draft, look }, undefined, "https://posh.vip/e/gh", flyer);
  assert.deepEqual(pub.backdrop, { kind: "image", src: flyer, fit: "poster" });
  assert.ok(pub.reels.every((r) => r.media?.kind === "image" && r.media.src === flyer));
  assert.equal(pub.look?.flyer, flyer);
  assert.equal(claimPublication(draft, undefined, "https://posh.vip/e/gh").backdrop, undefined);
});

test("the opening Claude cut from the flyer plays on the link, and only there: reels keep the still flyer", () => {
  const flyer = "https://example.supabase.co/storage/v1/object/public/reel-media/night/abc-flyer.jpg";
  const opening = parseOpening({
    beats: [
      { box: { x: 0.69, y: 0.02, w: 0.31, h: 0.37 }, move: "pull", seconds: 2, text: { lines: ["Masks on."], at: "bottom", size: "big" } },
      { box: { x: 0.35, y: 0.53, w: 0.3, h: 0.34 }, move: "tilt-up", seconds: 1.7 },
    ],
    hold: { x: 0.3, y: 0.5, w: 0.4, h: 0.4 },
  })!;
  const withOpening: StartDraft = { ...draft, reels: { screen: { title: "", tagline: "", watchLabel: "", heading: "" }, heroPrompt: "", reels: [], opening } };
  const pub = claimPublication(withOpening, undefined, "https://posh.vip/e/gh", flyer);
  assert.deepEqual(pub.backdrop, { kind: "image", src: flyer, fit: "poster", opening });
  assert.equal(checkMedia(pub.backdrop), null);
  assert.ok(pub.reels.every((r) => r.media?.kind === "image" && !("opening" in r.media)));
  // The preview, before the claim, plays it over the flyer in the browser.
  assert.equal(draftLink(withOpening).publication.backdrop && "opening" in draftLink(withOpening).publication.backdrop!, true);
});
