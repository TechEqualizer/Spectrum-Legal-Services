// Where a link was shared (src/lib/source-tag.ts): every screen and export
// names a source with sourceLabel, and every visit, lead and follow is
// tagged with normalizeSourceTag, so the names and merges are pinned here.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DIRECT, normalizeSourceTag, sourceLabel } from "@/lib/source-tag";

test("other names for a place are that place", () => {
  for (const t of ["ig", "IG", "insta", "ig_web_copy_link", "Instagram"]) assert.equal(normalizeSourceTag(t), "instagram", t);
  assert.equal(normalizeSourceTag("tt"), "tiktok");
  assert.equal(normalizeSourceTag("fb"), "facebook");
  assert.equal(normalizeSourceTag("twitter"), "x");
  assert.equal(normalizeSourceTag("qr"), "flyer");
  assert.equal(normalizeSourceTag("poster"), "flyer");
});

test("anything else is kept as typed, if it's a usable tag", () => {
  assert.equal(normalizeSourceTag("bus-bench"), "bus-bench");
  assert.equal(normalizeSourceTag("dj_mike"), "dj_mike");
  assert.equal(normalizeSourceTag("l.instagram.com"), undefined);
  assert.equal(normalizeSourceTag(""), undefined);
  assert.equal(normalizeSourceTag(3), undefined);
});

test("known places read as their names", () => {
  assert.equal(sourceLabel("instagram"), "Instagram bio");
  assert.equal(sourceLabel("ig"), "Instagram bio");
  assert.equal(sourceLabel("flyer"), "Printed flyer or QR code");
  assert.equal(sourceLabel("calendar"), "Fan calendar");
  assert.equal(sourceLabel("google-search"), "Google search");
  assert.equal(sourceLabel("youtube"), "YouTube");
  assert.equal(sourceLabel("twitter"), "X (Twitter)");
});

test("other tags read as words in sentence case", () => {
  assert.equal(sourceLabel("bus-bench"), "Bus bench");
  assert.equal(sourceLabel("flyer-drop"), "Flyer drop");
  assert.equal(sourceLabel("dj-mikes-story"), "DJ mikes story");
  assert.equal(sourceLabel("vip_list"), "VIP list");
  assert.equal(sourceLabel("nye-promo-2"), "NYE promo 2");
});

test("no tag says so", () => {
  assert.equal(sourceLabel(undefined), DIRECT);
  assert.equal(sourceLabel(""), DIRECT);
});
