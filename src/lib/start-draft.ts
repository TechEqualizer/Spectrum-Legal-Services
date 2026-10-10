// The sign-up wizard's draft (docs/plans/05-signup.md): what the organizer
// has given so far, kept in their browser until they claim it, and the link
// it makes, for the phone beside the wizard. The phone plays the real funnel
// player, so what sells them is what fans will see.

import type { FunnelEvent } from "@/data/funnel-types";
import type { Funnel } from "@/data/funnel-types";
import { zonedToInstant } from "@/lib/event-time";
import type { Look } from "@/lib/look";
import { newClientEvent } from "@/lib/new-event";
import type { Publication } from "@/lib/publication";
import type { ImportedDate } from "@/lib/server/flyer-import";

export const ROLES = ["Promoter", "Venue", "Artist or DJ", "Organizer"] as const;
export type Role = (typeof ROLES)[number];

export type StartDraft = {
  role?: Role;
  /** The flyer as a small JPEG data URL (a PDF has none), for the phone's backdrop. */
  flyer?: string;
  /** What the flyer said. */
  dates?: ImportedDate[];
  look?: Look;
};

/** The night's name, from the flyer, else a stand-in. */
export const nightName = (d: StartDraft) => d.dates?.[0]?.name?.trim() || "Your night";

const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

/** The flyer's dates as the link's dates: 8 PM when it gives no time, on this browser's clock. */
export function draftEvents(dates: ImportedDate[], timeZone = browserZone()): FunnelEvent[] {
  return dates.flatMap((d, i) => {
    const startsAt = zonedToInstant(d.date, d.time || "20:00", timeZone);
    if (!startsAt) return [];
    return [
      {
        id: `night-${i + 1}`,
        name: d.name || "Your night",
        startsAt,
        ...(timeZone ? { timeZone } : {}),
        ...(d.venue ? { venue: d.venue } : {}),
        ...(d.price ? { price: d.price } : {}),
        ticketUrl: d.ticketUrl,
      },
    ];
  });
}

/** The link the draft makes so far: the funnel, and what's "published" on it. */
export function draftLink(d: StartDraft): { funnel: Funnel; publication: Publication } {
  const name = nightName(d);
  const funnel = newClientEvent(name, { slug: "your-night", name });
  const publication: Publication = {
    version: 1,
    reels: funnel.reels.map((r) => ({ ...r, cta: "funnel" as const })),
    funnel: { order: funnel.reels.map((r) => r.id), topics: {}, paths: {}, primaryCta: "tickets" },
    ...(d.flyer ? { backdrop: { kind: "image" as const, src: d.flyer, fit: "poster" as const } } : {}),
    ...(d.look ? { look: { ...d.look, flyer: undefined } } : {}),
    ...(d.dates?.length ? { events: draftEvents(d.dates) } : {}),
  };
  return { funnel, publication };
}
