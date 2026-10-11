// The plan rules (src/lib/plans.ts): every Core gate and the Plan card read
// hasCore and planSummary, so their edges are pinned here.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { FREE, hasCore, hasFans, planSummary } from "@/lib/plans";

const DAY = 864e5;
const now = Date.parse("2026-11-10T12:00:00Z");
const at = (days: number) => new Date(now + days * DAY).toISOString();

test("without a plan, no Core: the link isn't live yet", () => {
  assert.equal(hasCore(FREE, now), false);
  assert.equal(planSummary(FREE, now).title, "Not live yet");
  assert.match(planSummary(FREE, now).detail, /Coming soon/);
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
  assert.equal(planSummary({ status: "canceled" }, now).title, "Not live");
});

// The fans add-on (Follow, presales, fans-only reels, the fan calendar): on Core, when added; comped has it.

test("the fans add-on: only on Core, when added (comped and trials have it)", () => {
  assert.equal(hasFans({ status: "active", periodEnd: at(20) }, now), false);
  assert.equal(hasFans({ status: "active", periodEnd: at(20), fans: true }, now), true);
  assert.equal(hasFans({ status: "canceled", fans: true }, now), false);
  assert.equal(hasFans({ status: "past_due", periodEnd: at(-3), fans: true }, now), true);
  assert.equal(hasFans({ status: "past_due", periodEnd: at(-8), fans: true }, now), false);
  assert.equal(hasFans({ status: "comped" }, now), true);
  assert.equal(hasFans({ status: "trialing", trialEndsAt: at(5) }, now), true);
  assert.equal(hasFans(FREE, now), false);
});
