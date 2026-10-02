// The reel editor's model (admin preview only; nothing is saved).
//
// A funnel is an ordered list of reels. Every reel goes to the next one in
// order unless an override says otherwise, so a simple funnel needs no
// setup beyond its order, and branching is added only where it helps.

import {
  defaultFunnel,
  reels as liveReels,
  type FunnelCta,
  type FunnelTrigger,
  type Reel,
} from "@/data/reels";

/** Where a reel leads: the next one in order, the end card, or a reel id. */
export type PathTarget = "next" | "end" | (string & {});

/** "funnel" uses the funnel's main action. */
export type ReelCta = "funnel" | FunnelCta | "text_later";

export type EditorReel = Reel & { cta: ReelCta };

export type EntryTrigger =
  | "any"
  | "first_visit"
  | "returning"
  | "src:instagram"
  | "src:tiktok"
  | "src:google"
  | "src:sms"
  | "src:referral";

export const ENTRY_TRIGGERS: { id: EntryTrigger; label: string }[] = [
  { id: "any", label: "Any visitor (when no other funnel matches)" },
  { id: "first_visit", label: "First visit" },
  { id: "returning", label: "Returning visitor" },
  { id: "src:instagram", label: "Link tagged Instagram" },
  { id: "src:tiktok", label: "Link tagged TikTok" },
  { id: "src:google", label: "Link tagged Google Business Profile" },
  { id: "src:sms", label: "Opened from a follow-up text" },
  { id: "src:referral", label: "Link from a referral partner" },
];

export const CTA_LABELS: Record<ReelCta, string> = {
  funnel: "Funnel default",
  call: "Call",
  book: "Book",
  text_later: "Text me later",
};

export type EditorFunnel = {
  id: string;
  name: string;
  isDefault: boolean;
  entry: EntryTrigger;
  primaryCta: FunnelCta;
  order: string[];
  /** Reels shown as "What happened?" choices, with their labels. */
  topics: Record<string, string>;
  /** Overrides only; a missing trigger means "next". */
  paths: Record<string, Partial<Record<FunnelTrigger, PathTarget>>>;
};

/** The reel shown after `reelId`, or null for the end card. */
export function resolveNext(
  funnel: EditorFunnel,
  reelId: string,
  trigger: FunnelTrigger
): string | null {
  const target = funnel.paths[reelId]?.[trigger] ?? "next";
  if (target === "end") return null;
  if (target === "next") return funnel.order[funnel.order.indexOf(reelId) + 1] ?? null;
  return funnel.order.includes(target) ? target : null;
}

/** Turns live links into order + overrides, keeping only links that differ from "next". */
function fromLinks(
  order: string[],
  links: Record<string, Record<FunnelTrigger, string | null>>
): EditorFunnel["paths"] {
  const paths: EditorFunnel["paths"] = {};
  order.forEach((id, i) => {
    const next = order[i + 1] ?? null;
    for (const trigger of ["completed", "skipped"] as const) {
      const live = links[id]?.[trigger] ?? null;
      if (live === next) continue;
      (paths[id] ??= {})[trigger] = live ?? "end";
    }
  });
  return paths;
}

// Order chosen so most live links are simply "next in order".
const liveOrder = [
  "car-accident-first-steps",
  "car-accident-recorded-statement",
  "injury-claim-deadlines",
  "rideshare-accident-insurance",
  "truck-accident-evidence",
  "motorcycle-accident-claims",
  "slip-and-fall-documentation",
  "dog-bite-california-law",
];

export const initialReels: EditorReel[] = liveReels.map((reel) => ({
  ...reel,
  cta: "funnel",
}));

export const initialFunnels: EditorFunnel[] = [
  {
    id: defaultFunnel.id,
    name: "Injury Insights",
    isDefault: true,
    entry: "any",
    primaryCta: defaultFunnel.primaryCta,
    order: liveOrder,
    topics: { ...defaultFunnel.cover.entryLabels },
    paths: fromLinks(liveOrder, defaultFunnel.links),
  },
  // Sample funnels showing entry triggers; not live.
  {
    id: "instagram-first-visit",
    name: "Instagram first visit",
    isDefault: false,
    entry: "src:instagram",
    primaryCta: "book",
    order: ["car-accident-first-steps", "rideshare-accident-insurance", "injury-claim-deadlines"],
    topics: {},
    paths: { "car-accident-first-steps": { skipped: "injury-claim-deadlines" } },
  },
  {
    id: "follow-up-texts",
    name: "Follow-up texts",
    isDefault: false,
    entry: "src:sms",
    primaryCta: "call",
    order: ["injury-claim-deadlines", "car-accident-recorded-statement"],
    topics: {},
    paths: {},
  },
];

/** Removes a reel from a funnel, sending anything that pointed at it to "next". */
export function removeFromFunnel(funnel: EditorFunnel, reelId: string): EditorFunnel {
  const paths: EditorFunnel["paths"] = {};
  for (const [id, p] of Object.entries(funnel.paths)) {
    if (id === reelId) continue;
    const kept = Object.fromEntries(
      Object.entries(p).filter(([, target]) => target !== reelId)
    );
    if (Object.keys(kept).length) paths[id] = kept;
  }
  const topics = { ...funnel.topics };
  delete topics[reelId];
  return { ...funnel, order: funnel.order.filter((id) => id !== reelId), paths, topics };
}

/** Basic check for media links: https:// or a path on this site. */
export function isMediaUrl(value: string) {
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
