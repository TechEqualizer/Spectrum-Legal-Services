"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { hasFans, type Plan } from "@/lib/plans";

// The organizer's plan for the screens that set up Core's features (the
// fans-only switch, presales): asked once per event per page load and
// shared. Settings → Plan loads its own, with billing.

const known = new Map<string, Promise<Plan | null>>();

function load(eventSlug: string): Promise<Plan | null> {
  let p = known.get(eventSlug);
  if (!p) {
    p = fetch(`/api/admin/plan?slug=${encodeURIComponent(eventSlug)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { plan?: Plan } | null) => d?.plan ?? null)
      .catch(() => null);
    known.set(eventSlug, p);
  }
  return p;
}

/** This event's organizer's plan, once known (undefined while loading or if it couldn't be read). */
export function usePlan(eventSlug: string | undefined): Plan | undefined {
  const [state, setState] = useState<{ slug: string; plan: Plan | undefined }>({ slug: "", plan: undefined });
  useEffect(() => {
    if (!eventSlug) return;
    let live = true;
    load(eventSlug).then((plan) => live && setState({ slug: eventSlug, plan: plan ?? undefined }));
    return () => {
      live = false;
    };
  }, [eventSlug]);
  return state.slug === eventSlug ? state.plan : undefined;
}

/**
 * Whether this event's organizer has the fans add-on (presales, fans-only
 * reels): true or false once known, and undefined while loading or if it
 * couldn't be read (screens then don't stand in the way; the live link's own
 * gates decide).
 */
export function useHasFans(eventSlug: string | undefined): boolean | undefined {
  const plan = usePlan(eventSlug);
  return plan ? hasFans(plan) : undefined;
}

/** Where Go live is: Settings → Plan. */
export const START_CORE_HREF = "/admin/settings#plan";
/** Where the fans add-on is: on Settings → Plan, its own part (or the box beside Go live). */
export const ADD_FANS_HREF = "/admin/settings#fans";

// "Not now" on the fans add-on's nudges: hidden for two weeks for that
// organizer, in this browser only. Settings → Plan always shows the add-on.
const SNOOZE_DAYS = 14;
const snoozeKey = (organizer: string) => `fans_nudge:${organizer}`;
const snoozeListeners = new Set<() => void>();
// Where the browser won't keep it (private mode): hidden for this page only.
const hidden = new Set<string>();

function snoozedUntil(organizer: string): number {
  try {
    return Number(localStorage.getItem(snoozeKey(organizer))) || 0;
  } catch {
    return 0;
  }
}

function onSnooze(change: () => void) {
  snoozeListeners.add(change);
  window.addEventListener("storage", change);
  return () => {
    snoozeListeners.delete(change);
    window.removeEventListener("storage", change);
  };
}

/** Whether this organizer's fans nudges are snoozed here, and "Not now". Snoozed until known (no flash on load). */
export function useFansSnooze(organizer: string | undefined): [snoozed: boolean, snooze: () => void] {
  const snoozed = useSyncExternalStore(
    onSnooze,
    () => !organizer || hidden.has(organizer) || snoozedUntil(organizer) > Date.now(),
    () => true
  );
  const snooze = () => {
    if (!organizer) return;
    try {
      localStorage.setItem(snoozeKey(organizer), String(Date.now() + SNOOZE_DAYS * 864e5));
    } catch {
      hidden.add(organizer);
    }
    snoozeListeners.forEach((l) => l());
  };
  return [snoozed, snooze];
}
