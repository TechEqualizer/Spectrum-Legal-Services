"use client";

import { useEffect, useId, useState } from "react";
import { CORE_PRICE, planSummary, type Plan } from "@/lib/plans";

type State = { slug: string; plan: Plan | null; error: string };

/** What Core adds, in the organizer's terms. */
const CORE_FEATURES = [
  "Unlimited fans following you",
  "Fan-only reels",
  "Presale links for your followers",
  "Every night in your fans' calendars",
];

/**
 * Settings → Plan, for one organizer: which plan they're on, in words, and
 * what Core adds. (Starting and managing Core comes with billing, step 2.)
 */
export default function PlanSettings({ organizer, eventSlug }: { organizer: { slug: string; name: string }; eventSlug: string }) {
  const id = useId();
  const [state, setState] = useState<State>({ slug: "", plan: null, error: "" });

  useEffect(() => {
    let current = true;
    fetch(`/api/admin/plan?slug=${encodeURIComponent(eventSlug)}`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!current) return;
        if (!res.ok || !body?.plan) setState({ slug: eventSlug, plan: null, error: body?.error ?? "Couldn't load your plan. Reload to try again." });
        else setState({ slug: eventSlug, plan: body.plan as Plan, error: "" });
      })
      .catch(() => current && setState({ slug: eventSlug, plan: null, error: "Couldn't reach the server. Check your connection and reload." }));
    return () => {
      current = false;
    };
  }, [eventSlug]);

  const { plan, error } = state.slug === eventSlug ? state : { plan: null, error: "" };
  const summary = plan ? planSummary(plan) : null;
  const free = summary?.title === "Free";

  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-600">Plan</h2>
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 sm:px-5">
        {error ? (
          <p role="alert" className="text-sm text-amber-900">{error}</p>
        ) : !summary ? (
          <p role="status" className="text-sm text-gray-600">Loading your plan…</p>
        ) : (
          <>
            <p className="text-base font-bold text-deep-navy">{summary.title}</p>
            <p className="mt-0.5 text-sm text-gray-600">
              {organizer.name} · {summary.detail}
            </p>
            {free && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-deep-navy">
                  Core: ${CORE_PRICE.month}/month, or ${CORE_PRICE.year}/year
                </p>
                <ul role="list" className="mt-2 space-y-1.5 text-sm text-gray-600">
                  {CORE_FEATURES.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden="true" className="text-deep-navy">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
