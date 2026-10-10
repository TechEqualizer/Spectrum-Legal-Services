"use client";

import { useEffect, useState } from "react";
import type { AdminEvent } from "@/admin/AdminBusiness";

/** One organizer's follower counts (see /api/admin/fans/counts). */
export type FanCounts = {
  organizer: string;
  followOn: boolean;
  following: number;
  current: number;
  previous: number;
  fromLink?: { current: number; previous: number };
};

/**
 * Follower counts for these events' organizers over the last `days` days,
 * one per organizer. With `fromLink`, each also counts who followed from
 * that event's own link. Null while loading; organizers that couldn't load
 * are left out. Follows are the organizer's, so an organizer with several
 * events is counted once.
 */
export function useFanCounts(events: AdminEvent[], days: number, fromLink = false): FanCounts[] | null {
  const [state, setState] = useState<{ key: string; counts: FanCounts[] | null }>({ key: "", counts: null });
  const one = new Map(events.map((e) => [e.organizer.slug, e]));
  const picked = fromLink ? events : [...one.values()];
  const key = `${picked.map((e) => e.funnel.slug).join(",")}:${days}:${fromLink}`;

  useEffect(() => {
    let current = true;
    Promise.all(
      picked.map((e) =>
        fetch(`/api/admin/fans/counts?slug=${encodeURIComponent(e.funnel.slug)}&days=${days}${fromLink ? `&funnel=${encodeURIComponent(e.funnel.id)}` : ""}`, { cache: "no-store" })
          .then(async (res) => (res.ok ? ((await res.json()) as FanCounts) : null))
          .catch(() => null)
      )
    ).then((all) => current && setState({ key, counts: all.filter((c): c is FanCounts => c !== null) }));
    return () => {
      current = false;
    };
    // `key` names everything `picked` holds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state.key === key ? state.counts : null;
}

/** Whether follower numbers mean anything yet: Follow is on, or someone already follows. */
export const showsFans = (counts: FanCounts[] | null) => Boolean(counts?.some((c) => c.followOn || c.following > 0 || c.current > 0 || c.previous > 0));
