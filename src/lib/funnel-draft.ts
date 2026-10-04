// A funnel drafted from a flyer (see lib/server/funnel-draft.ts), shared
// with the admin that reviews it.
//
// Upload a flyer, get four things: the opening scene and three core reels,
// each built on one proven reason people buy a ticket, in the order a
// visitor meets them:
//   1. The Night: desire and self-image. Who they get to be that night.
//   2. Your People: belonging and real social proof. People like them go.
//   3. Last Call: fear of missing out. The true reason to buy now.
// Each comes with a video prompt to paste into a video tool.

export const REEL_ROLES = {
  the_night: "The Night",
  your_people: "Your People",
  last_call: "Last Call",
} as const;
export type ReelRole = keyof typeof REEL_ROLES;

/** The order the three core reels play in. */
export const REEL_ORDER: ReelRole[] = ["the_night", "your_people", "last_call"];

/** What each core reel does for the visitor, and the driver behind it. */
export const REEL_DRIVERS: Record<ReelRole, { question: string; driver: string }> = {
  the_night: { question: "Will this be amazing?", driver: "Desire and self-image" },
  your_people: { question: "Is this for someone like me?", driver: "Belonging and social proof" },
  last_call: { question: "Why buy now?", driver: "Fear of missing out" },
};

export type DraftReel = {
  role: ReelRole;
  title: string;
  summary: string;
  /** The first two seconds: what stops the scroll. */
  hook: string;
  /** Short lines to add as captions when editing (never inside the generated video). */
  captions: string[];
  /** The date this reel sells (YYYY-MM-DD), when the flyer names one. */
  date?: string;
  /** Where the first shot starts: the organizer's own photo, the flyer's art, or words alone. */
  source: "photo" | "flyer_art" | "text";
  /** The full prompt for a video tool: camera, length, scene, shared look, what to avoid. */
  videoPrompt: string;
};

export type FunnelDraft = {
  screen: { title: string; tagline: string; watchLabel: string; heading: string };
  /** The opening scene's looping background video. */
  heroPrompt: string;
  /** The three core reels, in REEL_ORDER (one may be missing if the flyer gave nothing for it). */
  reels: DraftReel[];
};

/**
 * Which reel fills each core role, in REEL_ORDER: reels marked with a role
 * take theirs, and reels without one (made before roles, or by hand) fill
 * the earliest open slots in order. A slot without a reel is missing.
 */
export function coreReels<R extends { role?: ReelRole }>(reels: R[]): { role: ReelRole; reel?: R }[] {
  const slots = new Map<ReelRole, R | undefined>(REEL_ORDER.map((role) => [role, reels.find((r) => r.role === role)]));
  const open = REEL_ORDER.filter((role) => !slots.get(role));
  for (const reel of reels.filter((r) => !r.role)) {
    const role = open.shift();
    if (role) slots.set(role, reel);
  }
  return REEL_ORDER.map((role) => ({ role, reel: slots.get(role) }));
}
