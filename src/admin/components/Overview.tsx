"use client";

import { useState } from "react";
import OutcomeBars from "@/admin/components/OutcomeBars";
import SalesHint from "@/admin/components/SalesHint";
import StatTile, { TileGrid } from "@/admin/components/StatTile";
import { showsFans, useFanCounts, type FanCounts } from "@/admin/fan-counts";
import ViewsChart from "@/admin/components/ViewsChart";
import { useAdminBusiness, useAdminEvents } from "@/admin/AdminBusiness";
import { useResults } from "@/admin/results";
import { formatNumber, formatPercent } from "@/admin/viz";

const ranges = [
  { days: 7, label: "Last 7 days", short: "7 days" },
  { days: 30, label: "Last 30 days", short: "30 days" },
  { days: 90, label: "Last 90 days", short: "90 days" },
];

// No comparison when there was nothing before (a new event): not "0.0%".
const change = (now: number, before: number) => (before ? now / before - 1 : undefined);
// A rate out of nothing is nothing, not "NaN%".
const rate = (part: number, whole: number) => (whole ? part / whole : 0);

export default function Overview() {
  const [range, setRange] = useState(ranges[1]);
  const business = useAdminBusiness();
  const { results, error } = useResults(range.days);
  const event = useAdminEvents().filter((e) => e.funnel.slug === business.funnel.slug);
  const fanCounts = useFanCounts(event, range.days, true);
  // An event sells tickets: its "bookings" are ticket clicks.
  const tickets = business.funnel.primaryCta === "tickets";
  const won = tickets ? { many: "Ticket clicks", rate: "Ticket click rate", short: "Ticket clicks" } : { many: "Bookings from reels", rate: "Booking rate", short: "Booked" };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-deep-navy">
            Results
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
              className={`min-h-11 rounded px-3 text-sm font-semibold transition-colors ${
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

      {!results ? (
        <p role={error ? "alert" : "status"} className={`rounded-xl border px-5 py-6 text-sm ${error ? "border-amber-200 bg-amber-50 text-amber-900" : "border-gray-200 bg-white text-gray-600"}`}>
          {error || "Loading results…"}
        </p>
      ) : (
        <Figures results={results} won={won} periodLabel={range.short} topicLabel={business.terms.topic} fans={showsFans(fanCounts) ? fanCounts![0] : undefined} />
      )}
    </div>
  );
}

function Figures({
  results: { current, previous, daily, reels: rows, sales },
  won,
  periodLabel,
  topicLabel,
  fans,
}: {
  results: NonNullable<ReturnType<typeof useResults>["results"]>;
  fans?: FanCounts;
  won: { many: string; rate: string; short: string };
  periodLabel: string;
  topicLabel: string;
}) {
  const watchRate = rate(current.completed, current.views);
  const bookRate = rate(current.booked, current.views);
  return (
    <>
      {current.views === 0 && (
        <p className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-600">
          No views in this period yet. Results appear here as people open your link.
        </p>
      )}
      <TileGrid>
        {[
          <StatTile key="views" label="Reel views" value={formatNumber(current.views)} delta={change(current.views, previous.views)} periodLabel={periodLabel} />,
          <StatTile key="watch" label="Watch-through rate" value={formatPercent(watchRate)} delta={change(watchRate, rate(previous.completed, previous.views))} periodLabel={periodLabel} />,
          <StatTile key="won" label={won.many} value={formatNumber(current.booked)} delta={change(current.booked, previous.booked)} periodLabel={periodLabel} />,
          sales && <StatTile key="sold" label="Tickets sold" value={formatNumber(sales.current)} delta={change(sales.current, sales.previous)} periodLabel={periodLabel} />,
          <StatTile key="rate" label={won.rate} value={`${(bookRate * 100).toFixed(1)}%`} delta={change(bookRate, rate(previous.booked, previous.views))} periodLabel={periodLabel} />,
          fans?.fromLink && (
            <StatTile
              key="fans"
              label="New followers"
              value={formatNumber(fans.fromLink.current)}
              delta={change(fans.fromLink.current, fans.fromLink.previous)}
              periodLabel={periodLabel}
              note={`From this link · ${formatNumber(fans.following)} following in all`}
            />
          ),
        ].filter(Boolean)}
      </TileGrid>
      {!sales && <SalesHint className="-mt-3" />}

      <section className="rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="views-title">
        <h2 id="views-title" className="text-base font-bold text-deep-navy">
          Reel views per day
        </h2>
        <p className="mb-4 text-sm text-gray-600">All reels combined. Hover or use the arrow keys for each day.</p>
        <ViewsChart data={daily} />
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
                <th className="py-2 pr-4 font-semibold">{topicLabel}</th>
                <th className="py-2 pr-4 text-right font-semibold">Views</th>
                <th className="py-2 pr-4 text-right font-semibold">Watched</th>
                <th className="py-2 pr-4 text-right font-semibold">{won.short}</th>
                <th className="py-2 text-right font-semibold">{won.rate}</th>
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
                  <td className="py-2.5 text-right">{r.views ? `${((r.booked / r.views) * 100).toFixed(1)}%` : "\u2013"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
