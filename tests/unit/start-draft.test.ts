// The sign-up wizard's draft link (src/lib/start-draft.ts): what the phone
// shows at each step, and Core's features in it.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { applyPublication } from "@/lib/publication";
import { basicReels, draftLink, FANS_REEL_ID, type StartDraft } from "@/lib/start-draft";

const now = Date.parse("2026-10-07T12:00:00Z");
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

test("step 1: the night and its dates, no Core extras", () => {
  const { funnel, publication } = draftLink(draft, { now });
  const shown = applyPublication(funnel, publication);
  assert.equal(shown.cover.hero?.title, "Golden Hour");
  assert.equal(shown.events?.length, 2);
  assert.ok(!shown.events?.some((e) => e.presale));
  assert.ok(!shown.reels.some((r) => r.visibility === "fans"));
});

test("step 2: three reels in order over the flyer, then one for followers", () => {
  const { funnel, publication } = draftLink(draft, { core: true, now });
  const shown = applyPublication(funnel, publication);
  assert.deepEqual(shown.reels.map((r) => r.role ?? r.id), ["the_night", "your_people", "last_call", FANS_REEL_ID]);
  assert.ok(shown.reels.slice(0, 3).every((r) => r.media?.kind === "image" && r.eventId === "night-1"));
  const fans = shown.reels[3];
  assert.equal(fans.visibility, "fans");
  assert.equal(fans.media, undefined);
});

test("step 2: drafted words, and each reel sells its own date", () => {
  const reels = basicReels(draft);
  reels.screen.title = "Masks on";
  reels.reels[2] = { ...reels.reels[2], title: "Last call", date: "2026-11-08" };
  const { funnel, publication } = draftLink({ ...draft, reels }, { core: true, now });
  const shown = applyPublication(funnel, publication);
  assert.equal(shown.cover.hero?.title, "Masks on");
  assert.equal(shown.reels.find((r) => r.role === "last_call")?.eventId, "night-2");
});

test("step 2: a presale open now on the next date, ending a day before it", () => {
  const { publication } = draftLink(draft, { core: true, now });
  const [first, second] = publication.events!;
  assert.ok(first.presale);
  assert.ok(Date.parse(first.presale.opensAt) <= now && now < Date.parse(first.presale.endsAt));
  assert.ok(Date.parse(first.presale.endsAt) <= Date.parse(first.startsAt) - 864e5);
  assert.equal(second.presale, undefined);
});

test("no presale when the night is tomorrow", () => {
  const soon = { ...draft, dates: [date("2026-10-08", { time: "09:00" })] };
  assert.equal(draftLink(soon, { core: true, now }).publication.events?.[0].presale, undefined);
});

test("the basics: true to the flyer, nothing invented", () => {
  const r = basicReels(draft);
  assert.equal(r.screen.title, "Golden Hour");
  assert.match(r.screen.tagline, /The Rooftop/);
  assert.deepEqual(r.reels.map((x) => x.role), ["the_night", "your_people", "last_call"]);
  assert.match(r.reels[2].summary, /From \$30/);
});
