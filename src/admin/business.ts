// The businesses the admin can show, with their sample content: the words
// they use and how their reels tend to perform. All of it is SAMPLE data.
// The demos are defined here; organizers' events come from the database
// (see eventBusiness).

import { medspaFunnel } from "@/data/medspa";
import type { Funnel } from "@/data/funnel-types";

/** How a reel tends to do: daily views as an entry reel, watch-through, and booking rate. */
export type ReelProfile = { entryViews: number; watch: number; book: number };

export type AdminBusiness = {
  funnel: Funnel;
  /** Fixed seeds keep each business's sample numbers the same between visits. */
  seeds: { days: number; leads: number };
  profile: Record<string, ReelProfile>;
  terms: {
    /** Column heading for what the lead asked about. */
    topic: string;
    leadsIntro: string;
    /** The last lead status, after "Consultation booked". */
    wonStatus: string;
  };
  /** The live funnel's name in the reel editor. */
  funnelName: string;
  /** Order of the live funnel in the reel editor. */
  editorOrder: string[];
};

const medspa: AdminBusiness = {
  funnel: medspaFunnel,
  seeds: { days: 20261003, leads: 314 },
  profile: {
    "ms-wrinkle-relaxers-first-time": { entryViews: 44, watch: 0.62, book: 0.03 },
    "ms-natural-results": { entryViews: 0, watch: 0.7, book: 0.05 },
    "ms-lip-filler": { entryViews: 33, watch: 0.6, book: 0.035 },
    "ms-filler-aftercare": { entryViews: 0, watch: 0.66, book: 0.04 },
    "ms-glow-facial": { entryViews: 24, watch: 0.55, book: 0.03 },
    "ms-microneedling": { entryViews: 17, watch: 0.58, book: 0.035 },
    "ms-laser-hair": { entryViews: 20, watch: 0.5, book: 0.03 },
    "ms-pricing": { entryViews: 0, watch: 0.72, book: 0.08 },
    "ms-consultation": { entryViews: 0, watch: 0.75, book: 0.12 },
  },
  terms: {
    topic: "Treatment",
    leadsIntro: "Consultation requests, with the videos each person watched first.",
    wonStatus: "Treatment booked",
  },
  funnelName: "Skin Notes",
  editorOrder: medspaFunnel.reels.map((r) => r.id),
};

/** A number from a slug, so each organizer's sample numbers stay put between visits. */
function seedOf(slug: string) {
  let h = 2166136261;
  for (const c of slug) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Math.abs(h) % 100000;
}

/**
 * An organizer's event (from the database) as an admin business. Its
 * results and leads are sample numbers until real tracking is wired in.
 */
export function eventBusiness(funnel: Funnel): AdminBusiness {
  const seed = seedOf(funnel.slug);
  return {
    funnel,
    seeds: { days: 20260000 + seed, leads: seed },
    // Entry reels get the visits; the rest are reached from them.
    profile: Object.fromEntries(
      funnel.reels.map((r, i) => [
        r.id,
        { entryViews: funnel.entryReelIds.includes(r.id) ? 60 : 0, watch: 0.62 + (i % 3) * 0.04, book: 0.05 + (i % 2) * 0.02 },
      ])
    ),
    terms: {
      topic: "Interest",
      leadsIntro: "Update sign-ups, with the videos each person watched first. Ticket sales show in your ticketing report.",
      wonStatus: "Bought tickets",
      },
    funnelName: funnel.brand.seriesLabel,
    editorOrder: funnel.reels.map((r) => r.id),
  };
}

/** The built-in businesses (demos); organizers' events come from the database. */
export const builtInBusinesses: AdminBusiness[] = [medspa];
