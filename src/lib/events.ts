// Event helpers for ticketed funnels: what's coming up, what's become a
// recap, the countdown chip on each reel, and the ticket link with this
// platform's tracking codes added.

import type { Funnel, FunnelEvent, Reel } from "@/data/funnel-types";
import { eventDate, eventDaysAway, type EventClock } from "@/lib/event-time";

/** An organizer's next night on another link, for an event that's over. */
export type NextNight = { slug: string; name: string; startsAt: string; timeZone?: string };

/** Every date is over: the link is a recap now. */
export const allOver = (funnel: Funnel, now: number) => Boolean(funnel.events?.length) && upcomingEvents(funnel, now).length === 0;

const HOUR = 60 * 60 * 1000;
// An event counts as over six hours after it starts.
const RUNS_FOR = 6 * HOUR;

export function isOver(event: Pick<FunnelEvent, "startsAt">, now: number) {
  return Date.parse(event.startsAt) + RUNS_FOR < now;
}

/**
 * Where a date stands, the one rule every screen uses:
 * - `on_sale`: more than a week away
 * - `final_week`: within the next 7 days, not today
 * - `tonight`: today on the event's own calendar, not started yet
 * - `live`: started, and not over yet (6 hours after the start)
 * - `over`
 */
export type DateStage = "on_sale" | "final_week" | "tonight" | "live" | "over";

export function dateStage(event: EventClock, now: number): DateStage {
  if (isOver(event, now)) return "over";
  if (Date.parse(event.startsAt) <= now) return "live";
  const days = eventDaysAway(event, now);
  if (days <= 0) return "tonight";
  if (days <= 7) return "final_week";
  return "on_sale";
}

/** When the funnel's latest date starts, in ms (0 without dates): to sort events by their latest night. */
export const lastStart = (funnel: Funnel) => Date.parse(lastDate(funnel)?.startsAt ?? "1970-01-01T00:00:00Z");

/** The funnel's latest date, over or not. */
export function lastDate(funnel: Funnel): FunnelEvent | undefined {
  return [...(funnel.events ?? [])].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0];
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

/** "Sat, Oct 31", on the event's own clock. */
export function formatEventDate(event: Pick<FunnelEvent, "startsAt" | "timeZone">) {
  return eventDate(event, { weekday: "short", month: "short", day: "numeric" });
}

/** The chip for a reel or a "Which night?" choice: Tonight, In 3 days, Sold out, Recap... */
export function eventChip(event: FunnelEvent, now: number): { text: string; tone: "hot" | "plain" | "muted" } {
  if (isOver(event, now)) return { text: `Recap · ${formatEventDate(event)}`, tone: "muted" };
  if (event.status === "sold_out") return { text: "Sold out", tone: "muted" };
  // Days counted on the event's calendar: "Tonight" is the event's night, wherever the viewer is.
  const days = eventDaysAway(event, now);
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

/** Whether a date's presale for followers is open at `now` (and the date still to come). */
export const presaleOpen = (event: Pick<FunnelEvent, "presale" | "startsAt">, now: number) =>
  Boolean(event.presale && Date.parse(event.presale.opensAt) <= now && now < Date.parse(event.presale.endsAt) && !isOver(event, now));

/** The next date with a presale open now, if any. */
export const openPresale = (funnel: Funnel, now: number) => upcomingEvents(funnel, now).find((e) => presaleOpen(e, now));
