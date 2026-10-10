// Adding an event copies the organizer's published event, look included, and
// the copy must pass the same check every stored event does (funnel-record).
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseFunnelRecord } from "@/lib/funnel-record";
import { themeOf } from "@/lib/look";
import { newClientEvent, newEventFrom } from "@/lib/new-event";
import type { Funnel } from "@/data/funnel-types";

const colors = { "--deep-navy": "#302737", "--royal-blue": "#564961", "--teal-accent": "#C8A2E7", "--sky-accent": "#C8A2E7", "--soft-gray": "#F7F2EC" };
const source = newClientEvent("Big Love Productions", { slug: "masquerade", name: "Masquerade" });
// What the editor publishes once an organizer saves a look (applyPublication).
const styled: Funnel = { ...source, brand: { ...source.brand, theme: { ...source.brand.theme, ...themeOf({ font: "editorial", colors }) } } };

for (const mode of ["fresh", "copy"] as const) {
  test(`a ${mode} event from a styled event checks out`, () => {
    const made = newEventFrom(styled, { slug: "next-night", name: "Next Night" }, mode);
    const checked = parseFunnelRecord(JSON.parse(JSON.stringify(made)));
    assert.notEqual(typeof checked, "string", String(checked));
  });
}

test("a theme still can't carry other keys or non-hex values", () => {
  const bad = (theme: Record<string, string>) =>
    parseFunnelRecord(JSON.parse(JSON.stringify({ ...source, brand: { ...source.brand, theme } })));
  assert.equal(bad({ "--anything": "#FFFFFF" }), "bad theme");
  assert.equal(bad({ "--fx-color": "red; background:url(x)" }), "bad theme");
});
