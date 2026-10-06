// Moving through a funnel: which reel comes next. Each funnel's reels and
// links live in its own file (listed in src/data/funnels.ts) or, for an
// organizer's event, in the database.
//
// Like a drip campaign, but within one visit: what a visitor does with a reel
// decides the next one.
//   completed  watched to the end   -> usually a deeper reel on the same topic
//   skipped    swiped or tapped next -> a different topic
// `null` ends the funnel on its closing card.

import type { Funnel, FunnelTrigger } from "@/data/funnel-types";

export type {
  Funnel,
  FunnelBrand,
  FunnelCta,
  FunnelTrigger,
  Reel,
} from "@/data/funnel-types";

/** A reel within one funnel. */
export function funnelReel(funnel: Funnel, id: string) {
  return funnel.reels.find((reel) => reel.id === id);
}

/** The reel to show after `reelId`, or null for the end of the funnel. */
export function nextReelId(
  funnel: Funnel,
  reelId: string,
  trigger: FunnelTrigger
): string | null {
  return funnel.links[reelId]?.[trigger] ?? null;
}
