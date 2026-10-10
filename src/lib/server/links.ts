// What a /f/<slug> link shows. An event's own link shows that event. An
// organizer's permanent link (the one in their bio) shows their next event,
// so it never needs changing: the only upcoming event, a choice when
// several are coming up, or their latest event (as a recap) when none are.
// An event's link also learns its organizer's next night elsewhere, so once
// it's over it can send people on.

import type { Funnel, FunnelEvent } from "@/data/funnel-types";
import { lastStart, upcomingEvents, type NextNight } from "@/lib/events";
import { publicationWithoutFanMedia, withoutFanMedia } from "@/lib/fan-reels";
import { getOrganizer, organizerOf, type Organizer } from "@/lib/server/funnels";
import { getEventVersions, listOrganizerEventVersions, type EventVersions } from "@/lib/server/publications";

/**
 * An event link: the event as visitors see it (`live`), plus the built copy
 * and its published edits for the page's own player (which re-applies edits
 * in the admin's live preview). An organizer link with several events
 * coming up: a choice between them, each as visitors see it.
 */
export type LinkTarget =
  | ({ kind: "event"; nextNight?: NextNight } & EventVersions)
  | { kind: "choose"; organizer: Organizer; events: { funnel: Funnel; next: FunnelEvent }[] };

/** The event a link shows, as visitors see it (the soonest one, for a choice). */
export const shownFunnel = (target: LinkTarget): Funnel => (target.kind === "event" ? target.live : target.events[0].funnel);


/** An organizer's events as visitors see them, each with its next date (if any), soonest first. */
async function organizerNights(organizer: string, now: number) {
  const events = await listOrganizerEventVersions(organizer);
  const upcoming = events
    .flatMap((e) => {
      const next = upcomingEvents(e.live, now)[0];
      return next ? [{ ...e, next }] : [];
    })
    .sort((a, b) => Date.parse(a.next.startsAt) - Date.parse(b.next.startsAt));
  return { events, upcoming };
}

/**
 * What /f/<slug> shows, for visitors: fans-only reels never carry their
 * media here (the page, its reel pages and link previews all read this).
 */
export async function resolveLink(slug: string, now = Date.now()): Promise<LinkTarget | undefined> {
  const target = await resolve(slug, now);
  if (!target) return undefined;
  if (target.kind === "choose") return { ...target, events: target.events.map((e) => ({ ...e, funnel: withoutFanMedia(e.funnel) })) };
  return { ...target, base: withoutFanMedia(target.base), publication: publicationWithoutFanMedia(target.publication), live: withoutFanMedia(target.live) };
}

async function resolve(slug: string, now: number): Promise<LinkTarget | undefined> {
  const versions = await getEventVersions(slug);
  if (versions) {
    const organizer = await organizerOf(slug);
    const next = organizer ? (await organizerNights(organizer, now)).upcoming.find((e) => e.base.slug !== slug) : undefined;
    const nextNight = next && { slug: next.base.slug, name: next.live.cover.hero?.title ?? next.live.brand.seriesLabel, startsAt: next.next.startsAt, ...(next.next.timeZone ? { timeZone: next.next.timeZone } : {}) };
    return { kind: "event", ...versions, ...(nextNight ? { nextNight } : {}) };
  }

  const organizer = await getOrganizer(slug);
  if (!organizer) return undefined;
  const { events, upcoming } = await organizerNights(organizer.slug, now);
  if (!events.length) return undefined;
  if (upcoming.length > 1) {
    return { kind: "choose", organizer, events: upcoming.map(({ live, next }) => ({ funnel: live, next })) };
  }
  const shown = upcoming[0] ?? [...events].sort((a, b) => lastStart(b.live) - lastStart(a.live))[0];
  return { kind: "event", base: shown.base, publication: shown.publication, live: shown.live };
}
