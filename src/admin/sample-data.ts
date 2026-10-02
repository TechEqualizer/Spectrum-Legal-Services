// SAMPLE DATA for the admin preview. Nothing here comes from Supabase or from
// real visitors; it is generated from a fixed seed so the numbers stay put
// between visits. Real data replaces this once the admin has a login.

import { defaultFunnel, reels, type Reel } from "@/data/reels";

export const SAMPLE_DAYS = 180;

export type DailyReelStats = {
  views: number;
  completed: number;
  skipped: number;
  exited: number;
  booked: number;
};

export type ReelTotals = DailyReelStats & { reel: Reel };

// Deterministic pseudo-random numbers (mulberry32).
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// How each reel tends to perform: share of viewers who watch to the end,
// and who book from the reel itself.
const profile: Record<string, { entryViews: number; watch: number; book: number }> = {
  "car-accident-first-steps": { entryViews: 46, watch: 0.64, book: 0.035 },
  "car-accident-recorded-statement": { entryViews: 0, watch: 0.71, book: 0.05 },
  "injury-claim-deadlines": { entryViews: 0, watch: 0.68, book: 0.09 },
  "rideshare-accident-insurance": { entryViews: 21, watch: 0.58, book: 0.04 },
  "truck-accident-evidence": { entryViews: 14, watch: 0.61, book: 0.045 },
  "motorcycle-accident-claims": { entryViews: 17, watch: 0.52, book: 0.03 },
  "slip-and-fall-documentation": { entryViews: 11, watch: 0.49, book: 0.025 },
  "dog-bite-california-law": { entryViews: 9, watch: 0.57, book: 0.04 },
};

function buildDays(): Map<string, DailyReelStats>[] {
  const rand = seeded(20261002);
  const days: Map<string, DailyReelStats>[] = [];
  for (let d = 0; d < SAMPLE_DAYS; d++) {
    // Gentle growth, a weekday rhythm, and day-to-day noise.
    const growth = 0.7 + (0.5 * d) / SAMPLE_DAYS;
    const weekday = [0.75, 1.1, 1.05, 1.0, 1.0, 0.95, 0.7][d % 7];
    const day = new Map<string, DailyReelStats>();
    const incoming = new Map<string, number>();

    // Walk the funnel in order so follow-up views come from real paths.
    const order = [
      ...defaultFunnel.entryReelIds,
      "car-accident-recorded-statement",
      "injury-claim-deadlines",
    ];
    for (const id of order) {
      const p = profile[id];
      const noise = 0.8 + rand() * 0.4;
      const views = Math.round(
        p.entryViews * growth * weekday * noise + (incoming.get(id) ?? 0)
      );
      const completed = Math.round(views * p.watch * (0.92 + rand() * 0.16));
      const rest = views - completed;
      const skipped = Math.round(rest * (0.62 + rand() * 0.1));
      const exited = rest - skipped;
      const booked = Math.round(views * p.book * (0.6 + rand() * 0.8));
      day.set(id, { views, completed, skipped, exited, booked });

      const links = defaultFunnel.links[id];
      for (const [trigger, count] of [
        ["completed", completed],
        ["skipped", skipped],
      ] as const) {
        const next = links?.[trigger];
        // Not everyone who reaches the next reel stays for it.
        if (next) incoming.set(next, (incoming.get(next) ?? 0) + count * 0.8);
      }
    }
    days.push(day);
  }
  return days;
}

const days = buildDays();

/** The last day in the sample, used as "today". */
export const SAMPLE_END = new Date("2026-10-01T19:00:00Z");

export function dayDate(index: number) {
  const date = new Date(SAMPLE_END);
  date.setDate(date.getDate() - (SAMPLE_DAYS - 1 - index));
  return date;
}

function sum(range: Map<string, DailyReelStats>[], id?: string): DailyReelStats {
  const total = { views: 0, completed: 0, skipped: 0, exited: 0, booked: 0 };
  for (const day of range) {
    for (const [reelId, s] of day) {
      if (id && reelId !== id) continue;
      total.views += s.views;
      total.completed += s.completed;
      total.skipped += s.skipped;
      total.exited += s.exited;
      total.booked += s.booked;
    }
  }
  return total;
}

/** Totals for the last `length` days, and for the `length` days before that. */
export function periodTotals(length: number) {
  const current = days.slice(SAMPLE_DAYS - length);
  const previous = days.slice(SAMPLE_DAYS - 2 * length, SAMPLE_DAYS - length);
  return { current: sum(current), previous: sum(previous) };
}

/** Total views per day across all reels for the last `length` days. */
export function dailyViews(length: number) {
  return days.slice(SAMPLE_DAYS - length).map((day, i) => ({
    date: dayDate(SAMPLE_DAYS - length + i),
    views: sum([day]).views,
  }));
}

/** Per-reel totals for the last `length` days, most viewed first. */
export function reelTotals(length: number): ReelTotals[] {
  const range = days.slice(SAMPLE_DAYS - length);
  return reels
    .map((reel) => ({ reel, ...sum(range, reel.id) }))
    .sort((a, b) => b.views - a.views);
}

// ---------------------------------------------------------------------------
// Sample leads and drip campaigns

export type LeadStatus = "New" | "Contacted" | "Consultation booked" | "Signed";

export type SampleLead = {
  id: string;
  receivedAt: Date;
  caseType: string;
  source: "Hero form" | "Video booking";
  referringReelId?: string;
  watchedReelIds: string[];
  campaignId?: string;
  status: LeadStatus;
};

const statuses: LeadStatus[] = ["New", "Contacted", "Consultation booked", "Signed"];

export const sampleLeads: SampleLead[] = (() => {
  const rand = seeded(99);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const leads: SampleLead[] = [];
  for (let i = 0; i < 18; i++) {
    const entry = pick(defaultFunnel.entryReelIds);
    const watched = [entry];
    let current: string | null = entry;
    while (current && rand() < 0.55) {
      current = defaultFunnel.links[current]?.completed ?? null;
      if (current) watched.push(current);
    }
    const fromVideo = rand() < 0.6;
    const reel = reels.find((r) => r.id === watched[watched.length - 1])!;
    const received = new Date(SAMPLE_END);
    received.setHours(received.getHours() - Math.round(i * 19 + rand() * 12));
    leads.push({
      id: `L-${1042 - i}`,
      receivedAt: received,
      caseType: reel.practiceArea,
      source: fromVideo ? "Video booking" : "Hero form",
      referringReelId: fromVideo ? reel.id : undefined,
      watchedReelIds: watched,
      campaignId: reel.practiceArea === "Car Accident" ? "car-accident-nurture" : undefined,
      status: i < 5 ? "New" : pick(statuses),
    });
  }
  return leads;
})();

export type DripStep = {
  id: string;
  /** Days after the trigger. */
  delayDays: number;
  reelId: string;
  subject: string;
};

export type DripCampaign = {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
  steps: DripStep[];
  stats: { enrolled: number; opened: number; watched: number; booked: number };
};

export const sampleCampaigns: DripCampaign[] = [
  {
    id: "car-accident-nurture",
    name: "Car accident follow-up",
    trigger: "New lead with case type Car Accident",
    active: true,
    steps: [
      { id: "s1", delayDays: 0, reelId: "car-accident-first-steps", subject: "What to do in the first days after your crash" },
      { id: "s2", delayDays: 2, reelId: "car-accident-recorded-statement", subject: "Before you talk to the insurance company" },
      { id: "s3", delayDays: 5, reelId: "injury-claim-deadlines", subject: "How long you have to file in California" },
    ],
    stats: { enrolled: 64, opened: 41, watched: 27, booked: 9 },
  },
  {
    id: "watched-not-booked",
    name: "Watched but didn't book",
    trigger: "Visitor finished a video, left an email, but didn't book within 2 days",
    active: true,
    steps: [
      { id: "s1", delayDays: 2, reelId: "injury-claim-deadlines", subject: "A quick note on filing deadlines" },
      { id: "s2", delayDays: 6, reelId: "rideshare-accident-insurance", subject: "Questions we hear every week" },
    ],
    stats: { enrolled: 38, opened: 22, watched: 13, booked: 4 },
  },
  {
    id: "motorcycle-nurture",
    name: "Motorcycle accident follow-up",
    trigger: "New lead with case type Motorcycle Accident",
    active: false,
    steps: [
      { id: "s1", delayDays: 0, reelId: "motorcycle-accident-claims", subject: "How we push back on rider bias" },
    ],
    stats: { enrolled: 0, opened: 0, watched: 0, booked: 0 },
  },
];
