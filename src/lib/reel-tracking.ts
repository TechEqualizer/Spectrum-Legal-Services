// Browser-side logging for the reel funnel.
//
// Each browser gets a random visitor id, kept in localStorage so a returning
// visitor's history carries over. Nothing is logged for visitors who send
// Global Privacy Control or Do Not Track.

import type { Funnel } from "@/data/funnel-types";
import { normalizeSourceTag } from "@/lib/source-tag";

export type ReelEvent =
  | "viewed"
  | "completed"
  | "skipped"
  | "exited"
  /** Tapped "Book": opened the callback form. */
  | "cta_clicked"
  | "call_clicked"
  | "text_later_clicked"
  | "shared"
  /** Tapped the heart (or double-tapped the video). */
  | "liked";

const VISITOR_KEY = "spectrum_visitor_id";
const SOURCE_KEY = "spectrum_source";
let memoryVisitorId: string | null = null;

function trackingAllowed() {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl !== true && nav.doNotTrack !== "1";
}

/** The anonymous visitor id, or null when the visitor has opted out of tracking. */
export function getVisitorId(): string | null {
  if (!trackingAllowed()) return null;
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Storage blocked (private mode, strict settings): keep an id for this page view.
    memoryVisitorId ??= crypto.randomUUID();
    return memoryVisitorId;
  }
}

/**
 * Where the visitor's link came from: the ?src= tag (or utm_source) on this
 * page, else the last one seen in this browser. The most recent link wins,
 * so a viewer who first came from Instagram and later from a text is
 * credited to the text.
 */
export function getSourceTag(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const fromUrl = normalizeSourceTag(params.get("src") ?? params.get("utm_source"));
  // Without tracking consent, use the tag on this page only and remember nothing.
  if (!trackingAllowed()) return fromUrl;
  try {
    if (fromUrl) localStorage.setItem(SOURCE_KEY, fromUrl);
    return fromUrl ?? normalizeSourceTag(localStorage.getItem(SOURCE_KEY));
  } catch {
    return fromUrl;
  }
}

export function trackReelEvent(funnel: Funnel, reelId: string, event: ReelEvent) {
  // Sample funnels show the product; their views aren't anyone's data.
  if (funnel.sample) return;
  const visitorId = getVisitorId();
  if (!visitorId) return;

  const body = JSON.stringify({
    visitorId,
    funnelId: funnel.id,
    reelId,
    event,
    sourceTag: getSourceTag(),
  });

  // sendBeacon survives the page closing; fall back to a keepalive fetch.
  const sent =
    typeof navigator.sendBeacon === "function" &&
    navigator.sendBeacon(
      "/api/reel-events",
      new Blob([body], { type: "application/json" })
    );
  if (!sent) {
    fetch("/api/reel-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}
