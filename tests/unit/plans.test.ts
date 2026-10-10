// The plan rules (src/lib/plans.ts): every Core gate and the Plan card read
// hasCore and planSummary, so their edges are pinned here.
import { strict as assert } from "node:assert";
import { test } from "node:test";
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
