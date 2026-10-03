// A published funnel: the admin's edits, stored in Supabase
// (funnel_publications) and applied over the funnel's built-in content.
// Shared by the funnel link, the API routes and the admin.

import { withEdits, type EditorFunnel, type EditorReel, type PathTarget, type ReelCta } from "@/admin/editor-model";
import type { Funnel, FunnelCta, ReelEmphasis, ReelMedia } from "@/data/funnel-types";

export type Publication = {
  version: 1;
  /** Every reel in the funnel, in no particular order. */
  reels: EditorReel[];
  /** The funnel's order, paths, topic choices and main button. */
  funnel: Pick<EditorFunnel, "order" | "topics" | "paths" | "primaryCta">;
  /** What plays behind the opening screen's title: absent keeps the default, null shows none. */
  backdrop?: ReelMedia | null;
};

/** The funnel as published, or the built-in one when nothing is published. */
export function applyPublication(base: Funnel, publication: Publication | null | undefined): Funnel {
  if (!publication) return base;
  const funnel = withEdits(base, publication.funnel, publication.reels);
  return "backdrop" in publication ? { ...funnel, cover: { ...funnel.cover, backdrop: publication.backdrop } } : funnel;
}

// ---------------------------------------------------------------------------
// Validation: everything a publish may contain, checked on the server before
// it is stored and again when it is read.

const REEL_ID = /^[a-z0-9-]{1,80}$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const CTAS: FunnelCta[] = ["call", "book", "tickets"];
const REEL_CTAS: ReelCta[] = ["funnel", "call", "book", "tickets", "text_later"];
const EMPHASES: ReelEmphasis[] = ["quiet", "builds", "bold"];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number, optional = false) =>
  (optional && v === undefined) || (typeof v === "string" && v.length <= max);

/** A link media may use: https, or a path on this site. Never a blob: link from one browser. */
function isMediaUrl(v: unknown) {
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

function checkMedia(m: unknown): string | null {
  if (!isObject(m)) return "media must be an object";
  if (m.kind === "youtube") return typeof m.id === "string" && YOUTUBE_ID.test(m.id) ? null : "bad YouTube id";
  if (m.kind === "image") return isMediaUrl(m.src) ? null : "photo needs an https link";
  if (m.kind === "video") {
    if (!isMediaUrl(m.src)) return "video needs an https link";
    if (m.poster !== undefined && !isMediaUrl(m.poster)) return "cover image needs an https link";
    if (m.captions !== undefined && !isMediaUrl(m.captions)) return "captions need an https link";
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
    if (r.media !== undefined) {
      const problem = checkMedia(r.media);
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
      ...(r.media ? { media: r.media as ReelMedia } : {}),
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
  if ("backdrop" in input && input.backdrop !== undefined) {
    if (input.backdrop !== null) {
      const problem = checkMedia(input.backdrop);
      if (problem) return `Opening screen: ${problem}.`;
    }
    publication.backdrop = input.backdrop as ReelMedia | null;
  }
  return publication;
}
