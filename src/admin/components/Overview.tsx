"use client";

import { useState } from "react";
import OutcomeBars from "@/admin/components/OutcomeBars";
import StatTile from "@/admin/components/StatTile";
import ViewsChart from "@/admin/components/ViewsChart";
import { useAdminBusiness } from "@/admin/AdminBusiness";
import { sampleFor } from "@/admin/sample-data";
import { formatNumber, formatPercent } from "@/admin/viz";

const ranges = [
  { days: 7, label: "Last 7 days", short: "7 days" },
  { days: 30, label: "Last 30 days", short: "30 days" },
  { days: 90, label: "Last 90 days", short: "90 days" },
];

const change = (now: number, before: number) => (before ? now / before - 1 : 0);

export default function Overview() {
  const [range, setRange] = useState(ranges[1]);
  const business = useAdminBusiness();
  const { periodTotals, dailyViews, reelTotals } = sampleFor(business);
  const { current, previous } = periodTotals(range.days);
  const watchRate = current.completed / current.views;
  const prevWatchRate = previous.completed / previous.views;
  const bookRate = current.booked / current.views;
  const prevBookRate = previous.booked / previous.views;
  const rows = reelTotals(range.days);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-deep-navy">
            Overview
          </h1>
          <p className="text-sm text-gray-600">
            How visitors move through {business.funnel.brand.name}&apos;s reels.
          </p>
        </div>
        {/* Date range: one row, above everything it scopes */}
        <div className="flex rounded-md border border-gray-300 bg-white p-1" role="group" aria-label="Date range">
          {ranges.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range.days === r.days}
              className={`min-h-9 rounded px-3 text-sm font-semibold transition-colors ${
                range.days === r.days
                  ? "bg-deep-navy text-white"
                  : "text-gray-700 hover:bg-soft-gray"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatTile label="Reel views" value={formatNumber(current.views)} delta={change(current.views, previous.views)} periodLabel={range.short} />
        <StatTile label="Watch-through rate" value={formatPercent(watchRate)} delta={change(watchRate, prevWatchRate)} periodLabel={range.short} />
        <StatTile label="Bookings from reels" value={formatNumber(current.booked)} delta={change(current.booked, previous.booked)} periodLabel={range.short} />
        <StatTile label="Booking rate" value={`${(bookRate * 100).toFixed(1)}%`} delta={change(bookRate, prevBookRate)} periodLabel={range.short} />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="views-title">
        <h2 id="views-title" className="text-base font-bold text-deep-navy">
          Reel views per day
        </h2>
        <p className="mb-4 text-sm text-gray-600">All reels combined. Hover or use the arrow keys for each day.</p>
        <ViewsChart data={dailyViews(range.days)} />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="outcomes-title">
        <h2 id="outcomes-title" className="text-base font-bold text-deep-navy">
          What viewers did with each reel
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Watching to the end follows the reel&apos;s &ldquo;watched&rdquo; path in the funnel; skipping follows its &ldquo;skipped&rdquo; path.
        </p>
        <OutcomeBars rows={rows} />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="reels-title">
        <h2 id="reels-title" className="mb-4 text-base font-bold text-deep-navy">
          Reel performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="py-2 pr-4 font-semibold">Reel</th>
                <th className="py-2 pr-4 font-semibold">{business.terms.topic}</th>
                <th className="py-2 pr-4 text-right font-semibold">Views</th>
                <th className="py-2 pr-4 text-right font-semibold">Watched</th>
                <th className="py-2 pr-4 text-right font-semibold">Booked</th>
                <th className="py-2 text-right font-semibold">Booking rate</th>
              </tr>
            </thead>
            <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
              {rows.map((r) => (
                <tr key={r.reel.id} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 font-medium text-deep-navy">{r.reel.title}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{r.reel.practiceArea}</td>
                  <td className="py-2.5 pr-4 text-right">{formatNumber(r.views)}</td>
                  <td className="py-2.5 pr-4 text-right">{formatPercent(r.completed / r.views)}</td>
                  <td className="py-2.5 pr-4 text-right">{formatNumber(r.booked)}</td>
                  <td className="py-2.5 text-right">{((r.booked / r.views) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
