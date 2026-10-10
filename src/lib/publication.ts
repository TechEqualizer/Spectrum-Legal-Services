// A published funnel: the admin's edits, stored in Supabase
// (funnel_publications) and applied over the funnel's built-in content.
// Shared by the funnel link, the API routes and the admin.

import { withEdits, type EditorFunnel, type EditorReel, type PathTarget, type ReelCta } from "@/admin/editor-model";
import type { Funnel, FunnelCta, FunnelEvent, ReelEmphasis, ReelMedia } from "@/data/funnel-types";
import { isTimeZone } from "@/lib/event-time";
import { fanRefFolder, isFanRef } from "@/lib/fan-reels";
import { parseLook, themeOf, type Look } from "@/lib/look";
import { REEL_ROLES, type ReelRole } from "@/lib/funnel-draft";

export type Publication = {
  version: 1;
  /** Every reel in the funnel, in no particular order. */
  reels: EditorReel[];
  /** The funnel's order, paths, topic choices and main button. */
  funnel: Pick<EditorFunnel, "order" | "topics" | "paths" | "primaryCta">;
  /** What plays behind the opening screen's title: absent keeps the default, null shows none. */
  backdrop?: ReelMedia | null;
  /** The opening screen's words; any left out keep the built-in ones. */
  screen?: ScreenCopy;
  /** Event dates, replacing the built-in list. */
  events?: FunnelEvent[];
  /** Brand colors and title typeface (e.g. matched to a flyer), over the built-in ones. */
  look?: Look;
};

/**
 * The opening screen's words. With a full opening scene (cover.hero):
 * title, tagline and button label over the scene, then heading and intro
 * above the dates. Without one: heading and intro over the scene.
 */
export type ScreenCopy = {
  title?: string;
  tagline?: string;
  watchLabel?: string;
  heading?: string;
  intro?: string;
};

export const SCREEN_LIMITS: Record<keyof ScreenCopy, number> = {
  title: 60,
  tagline: 140,
  watchLabel: 24,
  heading: 40,
  intro: 160,
};

/** The funnel as published, or the built-in one when nothing is published. */
export function applyPublication(base: Funnel, publication: Publication | null | undefined): Funnel {
  if (!publication) return base;
  const funnel = withEdits(base, publication.funnel, publication.reels);
  const { screen = {} } = publication;
  const { look } = publication;
  return {
    ...funnel,
    ...(publication.events ? { events: publication.events } : {}),
    ...(look
      ? { brand: { ...funnel.brand, theme: { ...funnel.brand.theme, ...themeOf(look) }, ...(look.effect ? { buttonEffect: look.effect } : {}) } }
      : {}),
    cover: {
      ...funnel.cover,
      ...(look ? { titleFont: look.font } : {}),
      ...("backdrop" in publication ? { backdrop: publication.backdrop } : {}),
      heading: screen.heading ?? funnel.cover.heading,
      intro: screen.intro ?? funnel.cover.intro,
      ...(funnel.cover.hero
        ? {
            hero: {
              ...funnel.cover.hero,
              title: screen.title ?? funnel.cover.hero.title,
              tagline: screen.tagline ?? funnel.cover.hero.tagline,
              watchLabel: screen.watchLabel ?? funnel.cover.hero.watchLabel,
            },
          }
        : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Validation: everything a publish may contain, checked on the server before
// it is stored and again when it is read.

const REEL_ID = /^[a-z0-9-]{1,80}$/;
const EVENT_ID = /^[a-z0-9-]{1,64}$/;
const STATUSES = ["on_sale", "few_left", "sold_out"] as const;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const CTAS: FunnelCta[] = ["call", "book", "tickets"];
const REEL_CTAS: ReelCta[] = ["funnel", "call", "book", "tickets", "text_later"];
const EMPHASES: ReelEmphasis[] = ["quiet", "builds", "bold"];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number, optional = false) =>
  (optional && v === undefined) || (typeof v === "string" && v.length <= max);

/** A link media may use: https, or a path on this site. Never a blob: link from one browser. */
export function isMediaUrl(v: unknown) {
  if (typeof v !== "string" || v.length > 2000) return false;
  if (v.startsWith("/") && !v.startsWith("//")) return true;
  try {
    const u = new URL(v);
    // http only for a local Supabase in development and tests.
    return u.protocol === "https:" || (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"));
  } catch {
    return false;
  }
}

/**
 * What's wrong with media, if anything. `fansFolder`: a fans-only reel of
 * this event, which may also name private files in its own folder.
 */
export function checkMedia(m: unknown, fansFolder?: string): string | null {
  if (!isObject(m)) return "media must be an object";
  const ok = (v: unknown) => isMediaUrl(v) || (fansFolder !== undefined && isFanRef(v) && fanRefFolder(v) === fansFolder);
  if (m.kind === "youtube") return typeof m.id === "string" && YOUTUBE_ID.test(m.id) ? null : "bad YouTube id";
  if (m.kind === "image") {
    if (m.fit !== undefined && m.fit !== "poster" && m.fit !== "blur") return "unknown photo fit";
    return ok(m.src) ? null : "photo needs an https link";
  }
  if (m.kind === "video") {
    if (!ok(m.src)) return "video needs an https link";
    if (m.poster !== undefined && !ok(m.poster)) return "cover image needs an https link";
    if (m.captions !== undefined && !ok(m.captions)) return "captions need an https link";
    return null;
  }
  return "unknown media kind";
}

/**
 * The publication if it's well formed for this funnel, or a message saying
 * what's wrong. Unknown fields are dropped.
 */
export function parsePublication(input: unknown, base: Funnel): Publication | string {
  if (!isObject(input) || input.version !== 1) return "Unknown publication version.";
  if (!Array.isArray(input.reels) || input.reels.length > 200) return "Reels are missing or too many.";
  const reels: EditorReel[] = [];
  const ids = new Set<string>();
  for (const r of input.reels) {
    if (!isObject(r) || typeof r.id !== "string" || !REEL_ID.test(r.id) || ids.has(r.id)) return "A reel has a bad or repeated id.";
    if (!text(r.title, 120) || !(r.title as string).trim()) return `Reel "${r.id}" needs a title.`;
    if (!text(r.summary, 300)) return `Reel "${r.id}" has a summary that's too long.`;
    if (typeof r.practiceArea !== "string" || !base.brand.services.includes(r.practiceArea)) return `Reel "${r.id}" has an unknown topic.`;
    if (!REEL_CTAS.includes(r.cta as ReelCta)) return `Reel "${r.id}" has an unknown button.`;
    if (r.emphasis !== undefined && !EMPHASES.includes(r.emphasis as ReelEmphasis)) return `Reel "${r.id}" has an unknown selling style.`;
    if (!text(r.badge, 40, true) || !text(r.duration, 20, true) || !text(r.eventId, 80, true)) return `Reel "${r.id}" has a bad field.`;
    if (r.role !== undefined && !(typeof r.role === "string" && r.role in REEL_ROLES)) return `Reel "${r.id}" has an unknown role.`;
    if (r.visibility !== undefined && r.visibility !== "fans") return `Reel "${r.id}" has an unknown audience.`;
    if (r.media !== undefined) {
      const problem = checkMedia(r.media, r.visibility === "fans" ? base.slug : undefined);
      if (problem) return `Reel "${r.title}": ${problem}.`;
    }
    ids.add(r.id);
    reels.push({
      id: r.id,
      title: r.title as string,
      summary: r.summary as string,
      practiceArea: r.practiceArea,
      cta: r.cta as ReelCta,
      ...(r.badge ? { badge: r.badge as string } : {}),
      ...(r.duration ? { duration: r.duration as string } : {}),
      ...(r.eventId ? { eventId: r.eventId as string } : {}),
      ...(r.emphasis ? { emphasis: r.emphasis as ReelEmphasis } : {}),
      ...(r.role ? { role: r.role as ReelRole } : {}),
      ...(r.media ? { media: r.media as ReelMedia } : {}),
      ...(r.visibility === "fans" ? { visibility: "fans" as const } : {}),
    });
  }

  const f = input.funnel;
  if (!isObject(f)) return "The funnel is missing.";
  if (!Array.isArray(f.order) || !f.order.every((id) => typeof id === "string" && ids.has(id)) || new Set(f.order).size !== f.order.length) {
    return "The reel order doesn't match the reels.";
  }
  if (f.order.length === 0) return "Add at least one reel before publishing.";
  const order = f.order as string[];
  if (!CTAS.includes(f.primaryCta as FunnelCta)) return "Unknown main button.";
  if (!isObject(f.topics)) return "Bad topic choices.";
  const topics: Record<string, string> = {};
  for (const [id, label] of Object.entries(f.topics)) {
    if (!order.includes(id) || !text(label, 40)) return "Bad topic choice.";
    topics[id] = label as string;
  }
  if (!isObject(f.paths)) return "Bad paths.";
  const paths: EditorFunnel["paths"] = {};
  for (const [id, p] of Object.entries(f.paths)) {
    if (!order.includes(id) || !isObject(p)) return "Bad path.";
    for (const [trigger, target] of Object.entries(p)) {
      if (trigger !== "completed" && trigger !== "skipped") return "Bad path.";
      if (target !== "next" && target !== "end" && !(typeof target === "string" && order.includes(target))) return "A path points at a missing reel.";
      (paths[id] ??= {})[trigger] = target as PathTarget;
    }
  }

  const publication: Publication = {
    version: 1,
    reels,
    funnel: { order, topics, paths, primaryCta: f.primaryCta as FunnelCta },
  };
  if (input.screen !== undefined) {
    if (!isObject(input.screen)) return "Bad opening screen words.";
    const screen: ScreenCopy = {};
    for (const [k, v] of Object.entries(input.screen)) {
      const max = SCREEN_LIMITS[k as keyof ScreenCopy];
      if (!max) continue;
      if (typeof v !== "string" || !v.trim() || v.length > max) return `Opening screen: the ${k} must be 1 to ${max} characters.`;
      screen[k as keyof ScreenCopy] = v.trim();
    }
    publication.screen = screen;
  }

  if (input.events !== undefined) {
    if (!base.events) return "This funnel doesn't have dates.";
    if (!Array.isArray(input.events) || input.events.length > 60) return "Dates are missing or too many.";
    const events: FunnelEvent[] = [];
    const eventIds = new Set<string>();
    for (const e of input.events) {
      if (!isObject(e) || typeof e.id !== "string" || !EVENT_ID.test(e.id) || eventIds.has(e.id)) return "A date has a bad or repeated id.";
      if (!text(e.name, 80) || !(e.name as string).trim()) return "Every date needs a name.";
      if (typeof e.startsAt !== "string" || Number.isNaN(Date.parse(e.startsAt))) return `"${e.name}" needs a date and time.`;
      if (!text(e.venue, 80, true) || !text(e.price, 30, true)) return `"${e.name}" has a venue or price that's too long.`;
      if (!isMediaUrl(e.ticketUrl) || (e.ticketUrl as string).startsWith("/")) return `"${e.name}" needs a ticket link starting with https://.`;
      if (e.status !== undefined && !STATUSES.includes(e.status as (typeof STATUSES)[number])) return `"${e.name}" has an unknown status.`;
      if (e.reelId !== undefined && !(typeof e.reelId === "string" && ids.has(e.reelId))) return `"${e.name}" opens a reel that isn't in the funnel.`;
      eventIds.add(e.id);
      events.push({
        id: e.id,
        name: (e.name as string).trim(),
        // The moment, as UTC; its clock is the time zone. A date without a
        // (valid) zone keeps the offset it was written with, if any, as its clock.
        ...(isTimeZone(e.timeZone)
          ? { startsAt: new Date(e.startsAt).toISOString(), timeZone: e.timeZone }
          : { startsAt: /[+-]\d{2}:?\d{2}$/.test(e.startsAt) ? e.startsAt : new Date(e.startsAt).toISOString() }),
        ticketUrl: e.ticketUrl as string,
        ...(typeof e.venue === "string" && e.venue.trim() ? { venue: e.venue.trim() } : {}),
        ...(typeof e.price === "string" && e.price.trim() ? { price: e.price.trim() } : {}),
        ...(e.status ? { status: e.status as FunnelEvent["status"] } : {}),
        ...(e.reelId ? { reelId: e.reelId as string } : {}),
      });
    }
    publication.events = events.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  }

  if (input.look !== undefined) {
    const look = parseLook(input.look, (v) => isMediaUrl(v) && !String(v).startsWith("/"));
    if (!look) return "The look's colors or typeface aren't valid.";
    publication.look = look;
  }

  if ("backdrop" in input && input.backdrop !== undefined) {
    if (input.backdrop !== null) {
      const problem = checkMedia(input.backdrop);
      if (problem) return `Opening screen: ${problem}.`;
    }
    publication.backdrop = input.backdrop as ReelMedia | null;
  }
  return publication;
}
