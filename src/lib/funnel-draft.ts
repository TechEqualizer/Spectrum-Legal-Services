// A funnel drafted from a flyer (see lib/server/funnel-draft.ts), shared
// with the admin that reviews it.

/** What each reel is for, in the order a visitor meets them. */
export const REEL_ROLES = {
  hook: "Hook",
  spectacle: "The show",
  belonging: "Who's there",
  details: "Details",
  dare: "The dare",
  last_call: "Last call",
} as const;
export type ReelRole = keyof typeof REEL_ROLES;

export type DraftReel = {
  role: ReelRole;
  title: string;
  summary: string;
  /** The date this reel sells (YYYY-MM-DD), when the flyer names one. */
  date?: string;
  /** Start from the organizer's own photo, the flyer's art, or text alone. */
  source: "photo" | "flyer_art" | "text";
  /** The full prompt for a video tool: camera, length, action, style, what to avoid. */
  videoPrompt: string;
};

export type FunnelDraft = {
  screen: { title: string; tagline: string; watchLabel: string; heading: string };
  /** The opening scene's looping background video. */
  heroPrompt: string;
  reels: DraftReel[];
};
