"use client";

import Link from "next/link";
import { useId } from "react";
import { useAdminEvents, useMaybeAdminBusiness } from "@/admin/AdminBusiness";
import { ADD_FANS_HREF, useFansSnooze, usePlan } from "@/admin/plan";
import type { EventResults } from "@/admin/results";
import { formatNumber } from "@/admin/viz";
import { FANS_PRICE, wantsFans } from "@/lib/plans";

/**
 * Home, for an organizer live on Core without the fans add-on: the add-on,
 * at the moment their numbers show people watching (the reel views on their
 * links over `days`), with Add Fans and Not now (two weeks).
 * (docs/plans/03-billing.md, "Fans add-on nudges".)
 */
export default function FansOffer({ results, days }: { results: EventResults[] | null; days: number }) {
  const id = useId();
  const slug = useMaybeAdminBusiness()?.funnel.slug;
  const events = useAdminEvents();
  const organizer = events.find((e) => e.funnel.slug === slug)?.organizer;
  const plan = usePlan(slug);
  const [snoozed, snooze] = useFansSnooze(organizer?.slug ?? slug);
  if (!plan || !organizer || snoozed || !wantsFans(plan)) return null;

  const per = plan.interval ?? "month";
  const views = (results ?? []).filter((r) => r.event.organizer.slug === organizer.slug).reduce((n, r) => n + r.results.current.views, 0);
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-[#e8be5a] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Fans add-on</p>
          <h2 id={`${id}-title`} className="mt-1 text-lg font-bold text-deep-navy">
            {views > 0 ? `${formatNumber(views)} reel views in ${days} days. Let them follow you.` : "Let the people watching follow you."}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            With the Fans add-on, anyone watching your link can follow, get presale links and see fans-only reels, so your next night sells to people who asked.
            They&apos;re yours to keep.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Link href={ADD_FANS_HREF} className="inline-flex min-h-11 items-center rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue">
            Add Fans · ${FANS_PRICE[per]}/{per}
          </Link>
          <button type="button" onClick={snooze} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-gray-600 hover:bg-soft-gray hover:text-deep-navy">
            Not now
          </button>
        </div>
      </div>
    </section>
  );
}
