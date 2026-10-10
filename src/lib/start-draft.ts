// The sign-up wizard's draft (docs/plans/05-signup.md): what the organizer
// has given so far, kept in their browser until they claim it, and the link
// it makes, for the phone beside the wizard. The phone plays the real funnel
// player, so what sells them is what fans will see.

import type { Funnel, FunnelEvent } from "@/data/funnel-types";
import type { EditorReel } from "@/admin/editor-model";
import { zonedToInstant } from "@/lib/event-time";
import { REEL_ORDER, type FunnelDraft } from "@/lib/funnel-draft";
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
  /** The opening scene and three reels drafted from the flyer, with the organizer's changes. */
  reels?: FunnelDraft;
  /** The reels couldn't be drafted: they start from the flyer's basics instead. */
  reelsFailed?: boolean;
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

/** The flyer's own day (YYYY-MM-DD) for one of the link's dates. */
const flyerDay = (d: StartDraft, e: FunnelEvent) => d.dates?.[Number(e.id.replace("night-", "")) - 1]?.date;

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

const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/**
 * Reels from the flyer's basics, for when they couldn't be drafted: the
 * same three, in plain words true to the flyer, ready to change.
 */
export function basicReels(d: StartDraft): FunnelDraft {
  const name = nightName(d);
  const first = d.dates?.[0];
  const when = first ? shortDate(first.date) : "";
  const reel = (role: FunnelDraft["reels"][number]["role"], title: string, summary: string) => ({
    role,
    title,
    summary,
    hook: "",
    captions: [],
    ...(first ? { date: first.date } : {}),
    source: "flyer_art" as const,
    videoPrompt: "",
  });
  return {
    screen: {
      title: name,
      tagline: [first?.venue, when].filter(Boolean).join(" · "),
      watchLabel: "Sneak peek inside",
      heading: "Which night?",
    },
    heroPrompt: "",
    reels: [
      reel("the_night", name, "Picture yourself there. This is the night you'll talk about."),
      reel("your_people", "Bring your crew", "Better together. Round up the people you'd want there."),
      reel("last_call", "Get your tickets", [when, first?.price].filter(Boolean).join(" · ") || "Get yours before the night."),
    ],
  };
}

/** The draft's reels: as drafted (and changed), else from the flyer's basics. */
export const reelsOf = (d: StartDraft): FunnelDraft => d.reels ?? basicReels(d);

/** The fans-only reel the preview shows locked, as a taste of Core. */
export const FANS_REEL_ID = "for-followers";

/** A reel's id on the draft link: its role, so edits keep their place. */
export const reelId = (role: string) => role.replace(/_/g, "-");

export type LinkOptions = {
  /** Show Core's features working: Follow, a fans-only reel and an open presale. */
  core?: boolean;
  /** The moment "now", for the presale's window (tests pass their own). */
  now?: number;
  /** The clock the flyer's dates are on: the organizer's browser's (the server is told it). */
  timeZone?: string;
};

/** The link the draft makes so far: the funnel, and what's "published" on it. */
export function draftLink(d: StartDraft, { core = false, now = Date.now(), timeZone = browserZone() }: LinkOptions = {}): { funnel: Funnel; publication: Publication } {
  const name = nightName(d);
  const funnel = newClientEvent(name, { slug: "your-night", name });
  const events = d.dates?.length ? draftEvents(d.dates, timeZone) : undefined;
  const flyer = d.flyer ? { kind: "image" as const, src: d.flyer, fit: "poster" as const } : undefined;

  let reels: EditorReel[] = funnel.reels.map((r) => ({ ...r, cta: "funnel" as const }));
  let screen: Publication["screen"];
  if (core) {
    const drafted = reelsOf(d);
    const practiceArea = funnel.brand.services[0];
    reels = REEL_ORDER.flatMap((role) => drafted.reels.find((r) => r.role === role) ?? []).map((r): EditorReel => {
      // The date it sells; with only one date, every reel sells that one.
      const event = (r.date && events?.find((e) => flyerDay(d, e) === r.date)) || events?.[0];
      return {
        id: reelId(r.role),
        title: r.title || " ",
        summary: r.summary,
        practiceArea,
        cta: "funnel" as const,
        role: r.role,
        ...(event ? { eventId: event.id } : {}),
        ...(r.role === "last_call" ? { emphasis: "bold" as const } : {}),
        // Until their videos come, each reel plays over the flyer.
        ...(flyer ? { media: flyer } : {}),
      };
    });
    reels.push({
      id: FANS_REEL_ID,
      title: "Just for followers",
      summary: "Behind the scenes, before anyone else.",
      practiceArea,
      cta: "funnel",
      visibility: "fans",
    });
    const s = drafted.screen;
    screen = {
      ...(s.title ? { title: s.title } : {}),
      ...(s.tagline ? { tagline: s.tagline } : {}),
      ...(s.watchLabel ? { watchLabel: s.watchLabel } : {}),
      ...(s.heading ? { heading: s.heading } : {}),
    };
  }

  // Core's presale, open now on the next date, ending a day before it.
  const shown = core && events?.length
    ? events.map((e, i) => {
        const ends = Math.min(now + 7 * 864e5, Date.parse(e.startsAt) - 864e5);
        return i === 0 && ends > now ? { ...e, presale: { opensAt: new Date(now - 36e5).toISOString(), endsAt: new Date(ends).toISOString() } } : e;
      })
    : events;

  const publication: Publication = {
    version: 1,
    reels,
    funnel: { order: reels.map((r) => r.id), topics: {}, paths: {}, primaryCta: "tickets" },
    ...(flyer ? { backdrop: flyer } : {}),
    ...(screen ? { screen } : {}),
    ...(d.look ? { look: { ...d.look, flyer: undefined } } : {}),
    ...(shown ? { events: shown } : {}),
  };
  return { funnel, publication };
}

/** A ticket link as https, or "" when it isn't one ("eventbrite.com/e/…" gets its https). */
export function httpsLink(v: string | undefined): string {
  const t = (v ?? "").trim();
  if (!t) return "";
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
    return u.protocol === "https:" && u.hostname.includes(".") ? u.href : "";
  } catch {
    return "";
  }
}

/** Whether a date from the flyer has no ticket link to sell it with. */
export const needsTicketLink = (d: StartDraft) => Boolean(d.dates?.length) && !d.dates!.some((x) => httpsLink(x.ticketUrl));

/** The organizer's name to suggest at claim: the flyer's name before any "Name: night" colon. */
export const suggestedName = (d: StartDraft) => {
  const name = d.dates?.[0]?.name?.trim() ?? "";
  return (name.includes(":") ? name.split(":")[0] : name).trim();
};

/**
 * What the claim publishes on the new event: the reels' words, the opening's
 * words, the dates and the look. Not the preview's extras (the locked reel,
 * the made-up presale) or the flyer picture (it stays in their browser; they
 * add their own media in the studio).
 */
export function claimPublication(d: StartDraft, timeZone?: string, ticketUrl?: string): Publication {
  // A date needs a ticket link to go live: the flyer's, else the one they gave, else another date's.
  const fallback = httpsLink(ticketUrl) || d.dates?.map((x) => httpsLink(x.ticketUrl)).find(Boolean) || "";
  const dates = d.dates?.map((x) => ({ ...x, ticketUrl: httpsLink(x.ticketUrl) || fallback })).filter((x) => x.ticketUrl);
  const { publication } = draftLink({ ...d, dates, flyer: undefined }, { core: true, timeZone });
  const reels = publication.reels.filter((r) => r.id !== FANS_REEL_ID);
  const claimed: Publication = { ...publication, reels, funnel: { ...publication.funnel, order: reels.map((r) => r.id) } };
  delete claimed.backdrop;
  if (claimed.events) claimed.events = claimed.events.map((e) => ({ ...e, presale: undefined }));
  return claimed;
}
