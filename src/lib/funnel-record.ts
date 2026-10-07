// A funnel stored as data (the event_funnels table), checked before it's
// used. Admins write these rows, but a link is public, so every field that
// reaches the page is checked here: links must be https (or a path on this
// site), text has limits, and references between reels must resolve.

import type { Funnel, FunnelBrand, FunnelCta, ReelEmphasis } from "@/data/funnel-types";
import { isTimeZone } from "@/lib/event-time";
import { LOOK_FONTS } from "@/lib/look";
import { checkMedia, isMediaUrl } from "@/lib/publication";

const ID = /^[a-z0-9-]{1,80}$/;
const CTAS: FunnelCta[] = ["call", "book", "tickets"];
const EMPHASES: ReelEmphasis[] = ["quiet", "builds", "bold"];
const STATUSES = ["on_sale", "few_left", "sold_out"];
const PROVIDERS = ["eventbrite", "posh", "dice", "other"];
const THEME_KEYS = ["--deep-navy", "--royal-blue", "--teal-accent", "--sky-accent", "--soft-gray", "--on-accent"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const COPY_TEXT = [
  "bookPrimary", "callBack", "callNow", "coverCallPrompt", "coverCall", "bookDone", "textLaterDone",
  "formFinePrint", "endHeading", "endBody", "shareButton", "shareText",
] as const;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
const optText = (v: unknown, max: number) => v === undefined || text(v, max);
const https = (v: unknown) => isMediaUrl(v) && !String(v).startsWith("/");

function checkBrand(b: unknown): string | null {
  if (!isObject(b)) return "brand is missing";
  if (!text(b.name, 120) || !b.name) return "brand needs a name";
  const logo = b.logo;
  if (!isObject(logo)) return "brand needs a logo";
  if (logo.kind === "wordmark") {
    if (!text(logo.text, 40) || !optText(logo.tagline, 40)) return "bad wordmark";
  } else if (logo.kind === "image") {
    if (!isMediaUrl(logo.src) || typeof logo.width !== "number" || typeof logo.height !== "number" || !text(logo.alt, 120)) return "bad logo image";
  } else return "unknown logo kind";
  if (!optText(b.handle, 60) || !optText(b.ageLimit, 12)) return "bad handle or age limit";
  if (b.byline !== undefined && !(Array.isArray(b.byline) && b.byline.length === 2 && b.byline.every((l) => text(l, 80)))) return "bad byline";
  if (b.phone !== undefined && !(isObject(b.phone) && text(b.phone.display, 30) && typeof b.phone.href === "string" && /^tel:\+?[0-9]{7,15}$/.test(b.phone.href))) return "bad phone";
  if (b.theme !== undefined && !(isObject(b.theme) && Object.entries(b.theme).every(([k, v]) => THEME_KEYS.includes(k) && typeof v === "string" && HEX.test(v)))) return "bad theme";
  if (!Array.isArray(b.services) || !b.services.length || !b.services.every((s) => text(s, 60) && s)) return "brand needs services";
  for (const key of ["smsConsent", "seriesLabel", "disclaimer", "footer"]) if (!text(b[key], 600)) return `brand needs ${key}`;
  const copy = b.copy;
  if (!isObject(copy)) return "brand needs copy";
  for (const key of COPY_TEXT) if (!text(copy[key], 400)) return `copy needs ${key}`;
  if (!optText(copy.ticketsPrimary, 30) || !optText(copy.textLaterButton, 30)) return "bad button labels";
  for (const key of ["book", "textLater"]) {
    const form = copy[key];
    if (!isObject(form) || !text(form.heading, 80) || !text(form.intro, 300) || !text(form.submit, 40)) return `copy needs ${key}`;
  }
  return null;
}

/** The funnel if it's well formed, or what's wrong with it. */
export function parseFunnelRecord(input: unknown): Funnel | string {
  if (!isObject(input)) return "not a funnel";
  const f = input;
  if (typeof f.id !== "string" || !ID.test(f.id) || typeof f.slug !== "string" || !ID.test(f.slug)) return "bad id or slug";
  const brandProblem = checkBrand(f.brand);
  if (brandProblem) return brandProblem;
  const brand = f.brand as FunnelBrand;
  if (!CTAS.includes(f.primaryCta as FunnelCta)) return "bad main action";

  if (!Array.isArray(f.reels) || !f.reels.length || f.reels.length > 60) return "needs reels";
  const reelIds = new Set<string>();
  for (const r of f.reels) {
    if (!isObject(r) || typeof r.id !== "string" || !ID.test(r.id) || reelIds.has(r.id)) return "bad reel id";
    reelIds.add(r.id);
    if (!brand.services.includes(r.practiceArea as string)) return `reel "${r.id}" has an unknown topic`;
    if (!text(r.title, 120) || !text(r.summary, 300) || !optText(r.duration, 20) || !optText(r.badge, 40)) return `reel "${r.id}" has bad text`;
    if (r.media !== undefined && checkMedia(r.media)) return `reel "${r.id}": ${checkMedia(r.media)}`;
    if (r.emphasis !== undefined && !EMPHASES.includes(r.emphasis as ReelEmphasis)) return `reel "${r.id}" has a bad emphasis`;
    if (!optText(r.eventId, 64)) return `reel "${r.id}" has a bad date`;
  }

  if (f.events !== undefined) {
    if (!Array.isArray(f.events) || f.events.length > 60) return "bad dates";
    for (const e of f.events) {
      if (!isObject(e) || typeof e.id !== "string" || !ID.test(e.id) || !text(e.name, 120)) return "bad date";
      if (typeof e.startsAt !== "string" || Number.isNaN(Date.parse(e.startsAt))) return `"${e.name}" has a bad start`;
      if (!optText(e.venue, 120) || !optText(e.price, 40)) return `"${e.name}" has bad details`;
      if (!https(e.ticketUrl)) return `"${e.name}" needs an https ticket link`;
      if (e.status !== undefined && !STATUSES.includes(e.status as string)) return `"${e.name}" has a bad status`;
      if (e.reelId !== undefined && !reelIds.has(e.reelId as string)) return `"${e.name}" opens a missing reel`;
    }
  }
  if (f.ticketing !== undefined && !(isObject(f.ticketing) && PROVIDERS.includes(f.ticketing.provider as string))) return "bad ticketing";

  const cover = f.cover;
  if (!isObject(cover) || !text(cover.heading, 80) || !text(cover.intro, 300)) return "bad opening screen";
  if (!isObject(cover.entryLabels) || !Object.values(cover.entryLabels).every((l) => text(l, 40))) return "bad entry labels";
  if (cover.backdrop !== undefined && cover.backdrop !== null && checkMedia(cover.backdrop)) return "bad opening background";
  if (cover.titleFont !== undefined && !(typeof cover.titleFont === "string" && cover.titleFont in LOOK_FONTS)) return "bad title font";
  if (cover.hero !== undefined) {
    const h = cover.hero;
    if (!isObject(h) || !text(h.title, 80) || !optText(h.tagline, 200) || !optText(h.watchLabel, 30)) return "bad opening scene";
    if (h.media !== undefined && checkMedia(h.media)) return "bad opening scene media";
    if (h.zoom !== undefined && !(typeof h.zoom === "number" && h.zoom >= 1 && h.zoom <= 3)) return "bad zoom";
  }

  if (!Array.isArray(f.entryReelIds) || !f.entryReelIds.length || !f.entryReelIds.every((id) => reelIds.has(id as string))) return "bad entry reels";
  if (!isObject(f.links)) return "bad paths";
  for (const [from, to] of Object.entries(f.links)) {
    if (!reelIds.has(from) || !isObject(to)) return "bad paths";
    for (const trigger of ["completed", "skipped"]) {
      const target = to[trigger];
      if (target !== null && !reelIds.has(target as string)) return `path from "${from}" goes to a missing reel`;
    }
  }
  if (f.live !== undefined && typeof f.live !== "boolean") return "bad live flag";

  // A stored funnel is never a sample: samples are made-up businesses in code.
  const funnel = { ...f } as Funnel;
  delete funnel.sample;
  // A date's time zone must be one Intl knows ("America/Detroit"); an unknown one is dropped, not fatal.
  if (funnel.events) {
    funnel.events = funnel.events.map((e) => {
      if (e.timeZone === undefined || isTimeZone(e.timeZone)) return e;
      const rest = { ...e };
      delete rest.timeZone;
      return rest;
    });
  }
  return funnel;
}
