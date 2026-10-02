// Browser-side logging for the reel funnel.
//
// Each browser gets a random visitor id, kept in localStorage so a returning
// visitor's history carries over. Nothing is logged for visitors who send
// Global Privacy Control or Do Not Track.

import { defaultFunnel } from "@/data/reels";

export type ReelEvent =
  | "viewed"
  | "completed"
  | "skipped"
  | "cta_clicked"
  | "exited";

const VISITOR_KEY = "spectrum_visitor_id";
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

export function trackReelEvent(reelId: string, event: ReelEvent) {
  const visitorId = getVisitorId();
  if (!visitorId) return;

  const body = JSON.stringify({
    visitorId,
    funnelId: defaultFunnel.id,
    reelId,
    event,
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
