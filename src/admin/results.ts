"use client";

// What Results, Share, Home and the reel rows show: an organizer's event's
// real numbers, from /api/admin/stats (the database's funnel_stats).

import { useEffect, useState } from "react";
import { useAdminEvents, useMaybeAdminBusiness, type AdminEvent } from "@/admin/AdminBusiness";
import type { DailyReelStats, ReelTotals, SourceTotals } from "@/admin/stats";
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
  /**
   * Tickets sold on Eventbrite, when the organizer has it connected (or sales
   * were recorded before): this period and the one before, and those sold
   * without one of our tracking codes ("Eventbrite (other)"). null: no sales
   * to show, so the screens keep to ticket clicks.
   */
  sales: { current: number; previous: number; other: number } | null;
};

/** What /api/admin/stats returns (the database's funnel_stats). */
export type StatsResponse = {
  current: Record<string, number>;
  previous: Record<string, number>;
  daily: { date: string; views: number }[];
  reels: { reel: string; event: string; n: number }[];
  sources: { tag: string | null; visitors: number; tickets: number; calls: number }[];
  updates: { tag: string | null; n: number }[];
  /** Tickets sold (Eventbrite), this period and the one before. Missing before the Eventbrite migration. */
  sold?: { current: number; previous: number };
  /** Tickets sold this period per source tag; null: not from our links. */
  sales?: { tag: string | null; n: number }[];
  /** Whether the event's organizer has Eventbrite connected. */
  eventbrite?: boolean;
};

/** Our ticket links without a ?src= tag carry reels_direct: that's the Direct row (no tag). */
const salesTag = (tag: string) => (tag === "direct" ? "" : tag);

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
  // Tickets sold by source; orders without our code (tag null) are "other".
  const sold = new Map<string, number>();
  let other = 0;
  for (const s of raw.sales ?? []) {
    if (s.tag === null) other += s.n;
    else sold.set(salesTag(s.tag), (sold.get(salesTag(s.tag)) ?? 0) + s.n);
  }
  const tags = new Set([...raw.sources.map((s) => s.tag ?? ""), ...updates.keys(), ...sold.keys()]);
  const sources = [...tags]
    .map((tag): SourceTotals => {
      const s = raw.sources.find((r) => (r.tag ?? "") === tag);
      return { tag: tag || undefined, visitors: s?.visitors ?? 0, calls: s?.calls ?? 0, bookings: s?.tickets ?? 0, textLater: updates.get(tag) ?? 0, sold: sold.get(tag) ?? 0 };
    })
    .sort((a, b) => b.visitors - a.visitors);

  const soldTotals = { current: raw.sold?.current ?? 0, previous: raw.sold?.previous ?? 0 };
  const sales = raw.eventbrite || soldTotals.current > 0 || soldTotals.previous > 0 ? { ...soldTotals, other } : null;

  return { current: totalsOf(raw.current), previous: totalsOf(raw.previous), daily, reels, sources, sales };
}

type State = { key: string; results: Results | null; error: string };

/**
 * Results for the event being edited over the last `days` days. `results`
 * is null while they load (or when there's no event to show); `error` says
 * why they couldn't.
 */
export function useResults(days: number): { results: Results | null; error: string } {
  const business = useMaybeAdminBusiness();
  const event = useAdminEvents().find((e) => e.funnel.slug === business?.funnel.slug);
  const key = `${event?.funnel.slug ?? ""}:${days}`;
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

  if (!event) return { results: null, error: "" };
  // Until this event and period's numbers arrive, show nothing rather than the last ones.
  return state.key === key ? { results: state.results, error: state.error } : { results: null, error: "" };
}

/** One event's results, for Home. */
export type EventResults = { event: AdminEvent; results: Results };

/**
 * Results for every organizer's event this admin runs, over the last `days`
 * days, fetched side by side. `results` is null while they load; events whose
 * numbers couldn't load are left out and counted in `failed`.
 */
export function useAllResults(days: number): { results: EventResults[] | null; failed: number } {
  const events = useAdminEvents();
  const [state, setState] = useState<{ key: string; results: EventResults[] | null; failed: number }>({ key: "", results: null, failed: 0 });
  const key = `${events.map((e) => e.funnel.slug).join(",")}:${days}`;

  useEffect(() => {
    let current = true;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    Promise.all(
      events.map((event) =>
        fetch(`/api/admin/stats?slug=${encodeURIComponent(event.funnel.slug)}&days=${days}&tz=${encodeURIComponent(tz)}`)
          .then(async (res) => (res.ok ? { event, results: realResults((await res.json()) as StatsResponse, event.live, days) } : null))
          .catch(() => null)
      )
    ).then((all) => {
      if (!current) return;
      const results = all.filter((r): r is EventResults => r !== null);
      setState({ key, results, failed: all.length - results.length });
    });
    return () => {
      current = false;
    };
  }, [events, days, key]);

  return state.key === key ? { results: state.results, failed: state.failed } : { results: null, failed: 0 };
}
