// SAMPLE DATA for the admin preview. Nothing here comes from Supabase or from
// real visitors; it is generated from each business's fixed seeds and reel
// profile (src/admin/business.ts), so the numbers stay put between visits.
// Real data replaces this once the admin has a login.

import type { AdminBusiness } from "@/admin/business";
import type { Funnel, Reel } from "@/data/funnel-types";

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

/**
 * Reels in an order where each one comes after the reels that lead to it:
 * entry reels first, then the rest by how many "watched" steps they are in.
 */
function walkOrder(funnel: Funnel) {
  const depth = new Map<string, number>(funnel.entryReelIds.map((id) => [id, 0]));
  for (let pass = 0; pass < funnel.reels.length; pass++) {
    let changed = false;
    for (const [id, d] of depth) {
      for (const next of Object.values(funnel.links[id] ?? {})) {
        if (!next || funnel.entryReelIds.includes(next)) continue;
        if ((depth.get(next) ?? -1) < d + 1) {
          depth.set(next, Math.min(d + 1, funnel.reels.length));
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  const rest = funnel.reels
    .map((r) => r.id)
    .filter((id) => !funnel.entryReelIds.includes(id))
    .sort((a, b) => (depth.get(a) ?? 99) - (depth.get(b) ?? 99));
  return [...funnel.entryReelIds, ...rest];
}

function buildDays(business: AdminBusiness): Map<string, DailyReelStats>[] {
  const { funnel, profile } = business;
  const rand = seeded(business.seeds.days);
  const order = walkOrder(funnel);
  const days: Map<string, DailyReelStats>[] = [];
  for (let d = 0; d < SAMPLE_DAYS; d++) {
    // Gentle growth, a weekday rhythm, and day-to-day noise.
    const growth = 0.7 + (0.5 * d) / SAMPLE_DAYS;
    const weekday = [0.75, 1.1, 1.05, 1.0, 1.0, 0.95, 0.7][d % 7];
    const day = new Map<string, DailyReelStats>();
    const incoming = new Map<string, number>();

    // Walk the funnel in order so follow-up views come from real paths.
    for (const id of order) {
      const p = profile[id] ?? { entryViews: 0, watch: 0.6, book: 0.03 };
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

      const links = funnel.links[id];
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

// ---------------------------------------------------------------------------
// Leads

export type SampleLead = {
  id: string;
  receivedAt: Date;
  caseType: string;
  source: "Hero form" | "Video booking" | "Text me later";
  /** Where their funnel link came from (the ?src= tag); undefined for direct visits. */
  sourceTag?: string;
  referringReelId?: string;
  watchedReelIds: string[];
  status: string;
};

/** The lead statuses in order; the last one is the business's own word for a win. */
export function leadStatuses(business: AdminBusiness) {
  return ["New", "Contacted", "Consultation booked", business.terms.wonStatus];
}

function buildLeads(business: AdminBusiness): SampleLead[] {
  const { funnel } = business;
  const rand = seeded(business.seeds.leads);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const statuses = leadStatuses(business);
  const leads: SampleLead[] = [];
  for (let i = 0; i < 18; i++) {
    const entry = pick(funnel.entryReelIds);
    const watched = [entry];
    let current: string | null = entry;
    while (current && rand() < 0.55) {
      current = funnel.links[current]?.completed ?? null;
      if (current) watched.push(current);
    }
    // A business without a website form gets all its leads from the reels.
    const fromVideo = !business.terms.hasWebsiteForm || rand() < 0.6;
    const textLater = fromVideo && rand() < 0.25;
    const sourceTag = pick(["instagram", "instagram", "google", "tiktok", "sms", "referral", "share", undefined]);
    const reel = funnel.reels.find((r) => r.id === watched[watched.length - 1])!;
    const received = new Date(SAMPLE_END);
    received.setHours(received.getHours() - Math.round(i * 19 + rand() * 12));
    leads.push({
      id: `L-${1042 - i}`,
      receivedAt: received,
      caseType: reel.practiceArea,
      source: textLater ? "Text me later" : fromVideo ? "Video booking" : "Hero form",
      sourceTag,
      referringReelId: fromVideo ? reel.id : undefined,
      watchedReelIds: watched,
      status: i < 5 ? "New" : pick(statuses),
    });
  }
  return leads;
}

// ---------------------------------------------------------------------------
// Results by link source (the ?src= tag on the funnel link)

export type SourceTotals = {
  /** undefined: opened without a tag (typed in, or an old link). */
  tag: string | undefined;
  visitors: number;
  calls: number;
  bookings: number;
  textLater: number;
};

// Share of visitors and how often they act, per place the link was shared.
// Search and texts bring fewer people who are readier to call; social bios
// bring more people who are earlier on.
const sourceProfile: {
  tag: string | undefined;
  share: number;
  call: number;
  book: number;
  text: number;
}[] = [
  { tag: "instagram", share: 0.31, call: 0.016, book: 0.024, text: 0.034 },
  { tag: "tiktok", share: 0.17, call: 0.007, book: 0.012, text: 0.027 },
  { tag: "google", share: 0.15, call: 0.052, book: 0.028, text: 0.009 },
  { tag: "facebook", share: 0.08, call: 0.019, book: 0.02, text: 0.021 },
  { tag: "sms", share: 0.07, call: 0.061, book: 0.047, text: 0 },
  { tag: "referral", share: 0.06, call: 0.072, book: 0.051, text: 0.012 },
  { tag: "share", share: 0.05, call: 0.038, book: 0.03, text: 0.018 },
  { tag: undefined, share: 0.11, call: 0.024, book: 0.019, text: 0.014 },
];

// ---------------------------------------------------------------------------

export type SampleData = ReturnType<typeof build>;

function build(business: AdminBusiness) {
  const days = buildDays(business);
  const { funnel } = business;
  return {
    /** Totals for the last `length` days, and for the `length` days before that. */
    periodTotals(length: number) {
      const current = days.slice(SAMPLE_DAYS - length);
      const previous = days.slice(SAMPLE_DAYS - 2 * length, SAMPLE_DAYS - length);
      return { current: sum(current), previous: sum(previous) };
    },
    /** Total views per day across all reels for the last `length` days. */
    dailyViews(length: number) {
      return days.slice(SAMPLE_DAYS - length).map((day, i) => ({
        date: dayDate(SAMPLE_DAYS - length + i),
        views: sum([day]).views,
      }));
    },
    /** Per-reel totals for the last `length` days, most viewed first. */
    reelTotals(length: number): ReelTotals[] {
      const range = days.slice(SAMPLE_DAYS - length);
      return funnel.reels
        .map((reel) => ({ reel, ...sum(range, reel.id) }))
        .sort((a, b) => b.views - a.views);
    },
    /** Visitors and actions per link source over the last `length` days. */
    sourceTotals(length: number): SourceTotals[] {
      const range = days.slice(SAMPLE_DAYS - length);
      // A visit starts at an entry reel, so entry-reel views stand in for visitors.
      let visitors = 0;
      for (const day of range) {
        for (const id of funnel.entryReelIds) visitors += day.get(id)?.views ?? 0;
      }
      const rand = seeded(length * 7919 + business.seeds.days);
      return sourceProfile.map((p) => {
        const v = Math.round(visitors * p.share * (0.9 + rand() * 0.2));
        return {
          tag: p.tag,
          visitors: v,
          calls: Math.round(v * p.call),
          bookings: Math.round(v * p.book),
          textLater: Math.round(v * p.text),
        };
      });
    },
    leads: buildLeads(business),
  };
}

const cache = new Map<string, SampleData>();

/** A business's sample data, built once per page load. */
export function sampleFor(business: AdminBusiness): SampleData {
  let data = cache.get(business.funnel.id);
  if (!data) {
    data = build(business);
    cache.set(business.funnel.id, data);
  }
  return data;
}
