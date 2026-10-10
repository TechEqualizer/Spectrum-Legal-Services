"use client";

import { useEffect, useState } from "react";
import { hasCore, type Plan } from "@/lib/plans";

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
 * Whether this event's organizer has Core: true or false once known, and
 * undefined while loading or if it couldn't be read (screens then don't
 * stand in the way; the live link's own gates decide).
 */
export function useHasCore(eventSlug: string | undefined): boolean | undefined {
  const plan = usePlan(eventSlug);
  return plan ? hasCore(plan) : undefined;
}

/** Where Start Core is: Settings → Plan. */
export const START_CORE_HREF = "/admin/settings#plan";
