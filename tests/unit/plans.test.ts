// The plan rules (src/lib/plans.ts): every Core gate and the Plan card read
// hasCore and planSummary, so their edges are pinned here.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fansOnPlan } from "@/lib/fan-list";
import { FREE, hasCore, planSummary } from "@/lib/plans";

const DAY = 864e5;
const now = Date.parse("2026-11-10T12:00:00Z");
const at = (days: number) => new Date(now + days * DAY).toISOString();

test("Free has no Core", () => {
  assert.equal(hasCore(FREE, now), false);
  assert.equal(planSummary(FREE, now).title, "Free");
});

test("comped is Core until its date, or for good", () => {
  assert.equal(hasCore({ status: "comped" }, now), true);
  assert.equal(hasCore({ status: "comped", compedUntil: at(1) }, now), true);
  assert.equal(hasCore({ status: "comped", compedUntil: at(-1) }, now), false);
  assert.equal(planSummary({ status: "comped" }, now).title, "Core, on Showlnk");
});

test("a trial is Core until it ends, and counts the days", () => {
  assert.equal(hasCore({ status: "trialing", trialEndsAt: at(5) }, now), true);
  assert.equal(hasCore({ status: "trialing", trialEndsAt: at(-0.01) }, now), false);
  assert.match(planSummary({ status: "trialing", trialEndsAt: at(5) }, now).detail, /^5 days left/);
  assert.match(planSummary({ status: "trialing", trialEndsAt: at(0.5) }, now).detail, /^1 day left/);
});

test("a declined card keeps Core for the grace week, then ends it", () => {
  assert.equal(hasCore({ status: "past_due", periodEnd: at(-3) }, now), true);
  assert.equal(hasCore({ status: "past_due", periodEnd: at(-8) }, now), false);
  assert.match(planSummary({ status: "past_due", periodEnd: at(-3) }, now).detail, /declined/);
});

test("active is Core; canceled isn't", () => {
  assert.equal(hasCore({ status: "active", periodEnd: at(20) }, now), true);
  assert.equal(hasCore({ status: "canceled" }, now), false);
});

// The fan list on each plan (src/lib/fan-list.ts).

const fan = (n: number, left = false) => ({
  email: `fan${n}@example.com`,
  confirmed_at: new Date(now - (200 - n) * 60_000).toISOString(),
  unfollowed_at: left ? at(-1) : null,
});
const crowd = [...Array.from({ length: 105 }, (_, i) => fan(i)), fan(500, true)];

test("Free: the first 100 following, everyone who left, and how many more wait", () => {
  const { fans, waiting } = fansOnPlan(crowd, FREE, now);
  assert.equal(waiting, 5);
  assert.equal(fans.filter((f) => !f.unfollowed_at).length, 100);
  assert.ok(fans.some((f) => f.email === "fan0@example.com") && !fans.some((f) => f.email === "fan104@example.com"));
  assert.ok(fans.some((f) => f.unfollowed_at));
});

test("Core, or a plan that couldn't be read: everyone", () => {
  assert.equal(fansOnPlan(crowd, { status: "active" }, now).waiting, 0);
  assert.equal(fansOnPlan(crowd, undefined, now).fans.length, crowd.length);
  assert.equal(fansOnPlan(crowd, { status: "trialing", trialEndsAt: at(-1) }, now).waiting, 5);
});
