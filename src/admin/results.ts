"use client";

// What Results, Share and the reel rows show: an organizer's event's real
// numbers (from /api/admin/stats), or a demo's sample data. Both arrive in
// one shape, so the screens don't care which.

import { useEffect, useState } from "react";
import { useAdminBusiness, useAdminEvents } from "@/admin/AdminBusiness";
import { sampleFor, type DailyReelStats, type ReelTotals, type SourceTotals } from "@/admin/sample-data";
import type { Funnel } from "@/data/funnel-types";

export type Results = {
  /** This period's totals, and the same length of time before it. */
  current: DailyReelStats;
  previous: DailyReelStats;
  /** Views per day, oldest first, one entry for every day of the period. */
  daily: { date: Date; views: number }[];
  /** Each reel's totals, most viewed first. */
  reels: ReelTotals[];
  /** Per place the link was shared, most visitors first. */
  sources: SourceTotals[];
};

/** What /api/admin/stats returns (the database's funnel_stats). */
export type StatsResponse = {
  current: Record<string, number>;
  previous: Record<string, number>;
  daily: { date: string; views: number }[];
  reels: { reel: string; event: string; n: number }[];
  sources: { tag: string | null; visitors: number; tickets: number; calls: number }[];
  updates: { tag: string | null; n: number }[];
};

/** Event counts as the admin's totals. A ticket click is an event's "booking". */
const totalsOf = (counts: Record<string, number>): DailyReelStats => ({
  views: counts.viewed ?? 0,
  completed: counts.completed ?? 0,
  skipped: counts.skipped ?? 0,
  exited: counts.exited ?? 0,
  booked: counts.cta_clicked ?? 0,
});

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The database's totals in the screens' shape, with a zero for every quiet day and reel. */
export function realResults(raw: StatsResponse, funnel: Funnel, days: number, now = new Date()): Results {
  const views = new Map(raw.daily.map((d) => [d.date, d.views]));
  const daily = Array.from({ length: days }, (_, i) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - i));
    return { date, views: views.get(dayKey(date)) ?? 0 };
  });

  const byReel = new Map<string, Record<string, number>>();
  for (const { reel, event, n } of raw.reels) byReel.set(reel, { ...byReel.get(reel), [event]: n });
  const reels = funnel.reels.map((reel) => ({ reel, ...totalsOf(byReel.get(reel.id) ?? {}) })).sort((a, b) => b.views - a.views);

  const updates = new Map(raw.updates.map((u) => [u.tag ?? "", u.n]));
  const tags = new Set([...raw.sources.map((s) => s.tag ?? ""), ...updates.keys()]);
  const sources = [...tags]
    .map((tag): SourceTotals => {
      const s = raw.sources.find((r) => (r.tag ?? "") === tag);
      return { tag: tag || undefined, visitors: s?.visitors ?? 0, calls: s?.calls ?? 0, bookings: s?.tickets ?? 0, textLater: updates.get(tag) ?? 0 };
    })
    .sort((a, b) => b.visitors - a.visitors);

  return { current: totalsOf(raw.current), previous: totalsOf(raw.previous), daily, reels, sources };
}

/** A demo's sample data in the same shape. */
export function sampleResults(business: ReturnType<typeof useAdminBusiness>, days: number): Results {
  const data = sampleFor(business);
  const { current, previous } = data.periodTotals(days);
  return { current, previous, daily: data.dailyViews(days), reels: data.reelTotals(days), sources: data.sourceTotals(days) };
}

type State = { key: string; results: Results | null; error: string };

/**
 * Results for the business being edited over the last `days` days: real for
 * an organizer's event, sample for a demo. `results` is null while real ones
 * load; `error` says why they couldn't.
 */
export function useResults(days: number): { results: Results | null; real: boolean; error: string } {
  const business = useAdminBusiness();
  const event = useAdminEvents().find((e) => e.funnel.slug === business.funnel.slug);
  const key = `${business.funnel.slug}:${days}`;
  const [state, setState] = useState<State>({ key: "", results: null, error: "" });

  useEffect(() => {
    if (!event) return;
    let current = true;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`/api/admin/stats?slug=${encodeURIComponent(event.funnel.slug)}&days=${days}&tz=${encodeURIComponent(tz)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!current) return;
        if (!res.ok || !body) {
          setState({ key, results: null, error: body?.error ?? "Couldn't load results. Reload to try again." });
        } else {
          setState({ key, results: realResults(body as StatsResponse, event.live, days), error: "" });
        }
      })
      .catch(() => current && setState({ key, results: null, error: "Couldn't reach the server. Check your connection and reload." }));
    return () => {
      current = false;
    };
  }, [event, days, key]);

  if (!event) return { results: sampleResults(business, days), real: false, error: "" };
  // Until this business and period's numbers arrive, show nothing rather than the last ones.
  return state.key === key ? { results: state.results, real: true, error: state.error } : { results: null, real: true, error: "" };
}
