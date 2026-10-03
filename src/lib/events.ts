// Event helpers for ticketed funnels: what's coming up, what's become a
// recap, the countdown chip on each reel, and the ticket link with this
// platform's tracking codes added.

import type { Funnel, FunnelEvent, Reel } from "@/data/funnel-types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// An event counts as over six hours after it starts.
const RUNS_FOR = 6 * HOUR;

export function isOver(event: FunnelEvent, now: number) {
  return new Date(event.startsAt).getTime() + RUNS_FOR < now;
}

/** Events that haven't finished, soonest first. */
export function upcomingEvents(funnel: Funnel, now: number) {
  return (funnel.events ?? [])
    .filter((e) => !isOver(e, now))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

/** The next event someone can still buy a ticket for. */
export function nextOnSale(funnel: Funnel, now: number) {
  return upcomingEvents(funnel, now).find((e) => e.status !== "sold_out");
}

/** The reel a date's circle opens: its chosen reel, else the first reel that sells it. */
export function openingReel(funnel: Funnel, event: FunnelEvent): Reel | undefined {
  return (
    (event.reelId ? funnel.reels.find((r) => r.id === event.reelId) : undefined) ??
    funnel.reels.find((r) => r.eventId === event.id)
  );
}

export function eventOf(funnel: Funnel, reel: Reel) {
  return reel.eventId ? funnel.events?.find((e) => e.id === reel.eventId) : undefined;
}

/**
 * What a reel's Tickets button sells: its own event while that's on sale,
 * otherwise (a recap, or sold out) the next event on sale.
 */
export function ticketTarget(funnel: Funnel, reel: Reel | undefined, now: number) {
  const own = reel ? eventOf(funnel, reel) : undefined;
  if (own && !isOver(own, now) && own.status !== "sold_out") return own;
  return nextOnSale(funnel, now);
}

/** Calendar day difference in the viewer's own time zone. */
function daysUntil(date: Date, now: number) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return Math.round((day.getTime() - start.getTime()) / DAY);
}

export function formatEventDate(event: FunnelEvent) {
  return new Date(event.startsAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** The chip for a reel or a "Which night?" choice: Tonight, In 3 days, Sold out, Recap... */
export function eventChip(event: FunnelEvent, now: number): { text: string; tone: "hot" | "plain" | "muted" } {
  if (isOver(event, now)) return { text: `Recap · ${formatEventDate(event)}`, tone: "muted" };
  if (event.status === "sold_out") return { text: "Sold out", tone: "muted" };
  const days = daysUntil(new Date(event.startsAt), now);
  const when =
    days <= 0 ? "Tonight" : days === 1 ? "Tomorrow" : days < 7 ? `In ${days} days` : formatEventDate(event);
  if (event.status === "few_left") return { text: `${when} · Few left`, tone: "hot" };
  return { text: when, tone: days <= 1 ? "hot" : "plain" };
}

/**
 * The ticket link with tracking, so the organizer's own ticketing report
 * shows which reel and which source sold each ticket. Eventbrite uses its
 * affiliate code (aff); other platforms get standard UTM tags.
 */
export function ticketHref(
  funnel: Funnel,
  event: FunnelEvent,
  { reelId, sourceTag }: { reelId?: string; sourceTag?: string }
) {
  let url: URL;
  try {
    url = new URL(event.ticketUrl);
  } catch {
    return event.ticketUrl;
  }
  const source = sourceTag ?? "direct";
  if (funnel.ticketing?.provider === "eventbrite") {
    // Eventbrite tracking codes: letters, numbers, dashes and underscores.
    url.searchParams.set("aff", `reels_${source}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 50));
  } else {
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", "reel_funnel");
    url.searchParams.set("utm_campaign", funnel.slug);
    if (reelId) url.searchParams.set("utm_content", reelId);
  }
  return url.toString();
}
