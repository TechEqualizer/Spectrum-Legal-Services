// An organizer's event (from the database) as the admin shows it: the words
// its screens use, and how the reel editor starts. Every number and lead the
// admin shows for it is real, from the database.

import type { Funnel } from "@/data/funnel-types";

export type AdminBusiness = {
  funnel: Funnel;
  terms: {
    /** Column heading for what a reel (or a lead) is about. */
    topic: string;
    leadsIntro: string;
  };
  /** The live funnel's name in the reel editor. */
  funnelName: string;
  /** Order of the live funnel in the reel editor. */
  editorOrder: string[];
};

/** An organizer's event as an admin business. */
export function eventBusiness(funnel: Funnel): AdminBusiness {
  return {
    funnel,
    terms: {
      topic: "Interest",
      leadsIntro: "People who asked to hear from you, with the reels they watched first. Ticket sales show in your ticketing report.",
    },
    funnelName: funnel.brand.seriesLabel,
    editorOrder: funnel.reels.map((r) => r.id),
  };
}
