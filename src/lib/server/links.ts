// What a /f/<slug> link shows. An event's own link shows that event. An
// organizer's permanent link (the one in their bio) shows their next event,
// so it never needs changing: the only upcoming event, a choice when
// several are coming up, or their latest event (as a recap) when none are.

import type { Funnel, FunnelEvent } from "@/data/funnel-types";
import { upcomingEvents } from "@/lib/events";
import { applyPublication, type Publication } from "@/lib/publication";
import { getFunnel, getOrganizer, listOrganizerEvents, type Organizer } from "@/lib/server/funnels";
import { getPublication } from "@/lib/server/publications";

export type LinkTarget =
  | { kind: "event"; funnel: Funnel; publication: Publication | null }
  | { kind: "choose"; organizer: Organizer; events: { funnel: Funnel; next: FunnelEvent }[] };

const lastStart = (f: Funnel) => Math.max(0, ...(f.events ?? []).map((e) => Date.parse(e.startsAt)));

export async function resolveLink(slug: string, now = Date.now()): Promise<LinkTarget | undefined> {
  const funnel = await getFunnel(slug);
  if (funnel) return { kind: "event", funnel, publication: (await getPublication(slug))?.publication ?? null };

  const organizer = await getOrganizer(slug);
  if (!organizer) return undefined;
  const events = await Promise.all(
    (await listOrganizerEvents(organizer.slug)).map(async (base) => {
      const publication = (await getPublication(base.slug))?.publication ?? null;
      return { base, publication, live: applyPublication(base, publication) };
    })
  );
  if (!events.length) return undefined;

  const upcoming = events
    .flatMap((e) => {
      const next = upcomingEvents(e.live, now)[0];
      return next ? [{ ...e, next }] : [];
    })
    .sort((a, b) => Date.parse(a.next.startsAt) - Date.parse(b.next.startsAt));
  if (upcoming.length > 1) {
    return { kind: "choose", organizer, events: upcoming.map(({ live, next }) => ({ funnel: live, next })) };
  }
  const shown = upcoming[0] ?? [...events].sort((a, b) => lastStart(b.live) - lastStart(a.live))[0];
  return { kind: "event", funnel: shown.base, publication: shown.publication };
}
