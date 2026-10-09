// The one rule for where a date stands (src/lib/events.ts): every screen,
// the link and its preview card read it, so its edges are pinned here.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { dateStage, isOver, lastDate, upcomingEvents } from "@/lib/events";
import type { Funnel } from "@/data/funnel-types";

const H = 60 * 60 * 1000;
// Big Love's night: Sat Oct 31, 2026, 8 PM in Detroit (midnight UTC).
const night = { startsAt: "2026-10-31T20:00:00-04:00", timeZone: "America/Detroit" };
const start = Date.parse(night.startsAt);
const at = (iso: string) => Date.parse(iso);

test("more than a week out is on sale", () => {
  assert.equal(dateStage(night, at("2026-10-07T16:00:00Z")), "on_sale");
});

test("the last 7 days are the final week", () => {
  assert.equal(dateStage(night, at("2026-10-24T16:00:00Z")), "final_week");
  assert.equal(dateStage(night, at("2026-10-30T16:00:00Z")), "final_week");
});

test("tonight is the event's own calendar day, wherever the viewer is", () => {
  // 2:30 AM in Detroit on the day: already Saturday there.
  assert.equal(dateStage(night, at("2026-10-31T06:30:00Z")), "tonight");
  // 7:59 PM in Detroit, a minute before doors.
  assert.equal(dateStage(night, start - 60_000), "tonight");
  // 11:59 PM Friday in Detroit is still the final week, though it's Saturday in London.
  assert.equal(dateStage(night, at("2026-10-31T03:59:00Z")), "final_week");
});

test("live from the start until 6 hours after", () => {
  assert.equal(dateStage(night, start), "live");
  assert.equal(dateStage(night, start + 6 * H), "live");
  assert.equal(dateStage(night, start + 6 * H + 1), "over");
  assert.equal(isOver(night, start + 6 * H + 1), true);
});

test("a date written with only an offset, no time zone, keeps its own day", () => {
  const offsetOnly = { startsAt: "2026-10-31T20:00:00-04:00" };
  assert.equal(dateStage(offsetOnly, at("2026-10-31T06:30:00Z")), "tonight");
});

const funnel = (events: { id: string; startsAt: string }[]) =>
  ({ events: events.map((e) => ({ ...e, name: e.id, ticketUrl: "https://example.com" })) }) as unknown as Funnel;

test("upcoming dates keep a started night until it's over, soonest first", () => {
  const f = funnel([
    { id: "later", startsAt: "2026-11-07T20:00:00-05:00" },
    { id: "tonight", startsAt: night.startsAt },
    { id: "past", startsAt: "2026-08-15T21:00:00-04:00" },
  ]);
  assert.deepEqual(upcomingEvents(f, start + 2 * H).map((e) => e.id), ["tonight", "later"]);
  assert.deepEqual(upcomingEvents(f, start + 7 * H).map((e) => e.id), ["later"]);
});

test("the last date is the latest, over or not", () => {
  const f = funnel([
    { id: "a", startsAt: "2026-08-15T21:00:00-04:00" },
    { id: "b", startsAt: night.startsAt },
  ]);
  assert.equal(lastDate(f)?.id, "b");
  assert.equal(lastDate(funnel([])), undefined);
});
