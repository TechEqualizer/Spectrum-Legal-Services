// The businesses the admin preview can show, with their sample content:
// the words they use and how their reels tend to perform. All of it is
// SAMPLE data.

import { eventsFunnel } from "@/data/events-sample";
import { medspaFunnel } from "@/data/medspa";
import { defaultFunnel } from "@/data/reels";
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
    /** Whether the business also has a website form (JLF's hero form). */
    hasWebsiteForm: boolean;
  };
  /** The live funnel's name in the reel editor. */
  funnelName: string;
  /** Order of the live funnel in the reel editor. */
  editorOrder: string[];
};

const jlf: AdminBusiness = {
  funnel: defaultFunnel,
  seeds: { days: 20261002, leads: 99 },
  profile: {
    "car-accident-first-steps": { entryViews: 46, watch: 0.64, book: 0.035 },
    "car-accident-recorded-statement": { entryViews: 0, watch: 0.71, book: 0.05 },
    "injury-claim-deadlines": { entryViews: 0, watch: 0.68, book: 0.09 },
    "rideshare-accident-insurance": { entryViews: 21, watch: 0.58, book: 0.04 },
    "truck-accident-evidence": { entryViews: 14, watch: 0.61, book: 0.045 },
    "motorcycle-accident-claims": { entryViews: 17, watch: 0.52, book: 0.03 },
    "slip-and-fall-documentation": { entryViews: 11, watch: 0.49, book: 0.025 },
    "dog-bite-california-law": { entryViews: 9, watch: 0.57, book: 0.04 },
  },
  terms: {
    topic: "Case type",
    leadsIntro: "Case evaluation requests, with the videos each person watched first.",
    wonStatus: "Signed",
    hasWebsiteForm: true,
  },
  funnelName: "Injury Insights",
  // Chosen so most live links are simply "next in order".
  editorOrder: [
    "car-accident-first-steps",
    "car-accident-recorded-statement",
    "injury-claim-deadlines",
    "rideshare-accident-insurance",
    "truck-accident-evidence",
    "motorcycle-accident-claims",
    "slip-and-fall-documentation",
    "dog-bite-california-law",
  ],
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
    hasWebsiteForm: false,
  },
  funnelName: "Skin Notes",
  editorOrder: medspaFunnel.reels.map((r) => r.id),
};

const events: AdminBusiness = {
  funnel: eventsFunnel,
  seeds: { days: 20261004, leads: 777 },
  profile: {
    "gh-this-sunday": { entryViews: 58, watch: 0.66, book: 0.06 },
    "gh-lineup": { entryViews: 0, watch: 0.72, book: 0.08 },
    "gh-last-time": { entryViews: 31, watch: 0.78, book: 0.03 },
    "gh-sold-out": { entryViews: 14, watch: 0.55, book: 0.02 },
    "gh-late-night": { entryViews: 22, watch: 0.62, book: 0.07 },
    "gh-venue": { entryViews: 0, watch: 0.58, book: 0.02 },
    "gh-presale": { entryViews: 0, watch: 0.7, book: 0.01 },
  },
  terms: {
    topic: "Event",
    leadsIntro: "Presale and waitlist sign-ups, with the videos each person watched first. Ticket sales show in your ticketing report.",
    wonStatus: "Bought tickets",
    hasWebsiteForm: false,
  },
  funnelName: "Sundays",
  editorOrder: eventsFunnel.reels.map((r) => r.id),
};

export const businesses: AdminBusiness[] = [jlf, medspa, events];
