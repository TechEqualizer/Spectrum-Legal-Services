"use client";

import { useState } from "react";
import type { ReelTotals } from "@/admin/stats";
import { formatNumber, formatPercent, labelInk, viz } from "@/admin/viz";

const outcomes = [
  { key: "completed", label: "Watched to the end", color: viz.series1 },
  { key: "skipped", label: "Skipped", color: viz.series2 },
  { key: "exited", label: "Closed the viewer", color: viz.series3 },
] as const;

type Hover = { reelId: string; key: (typeof outcomes)[number]["key"] } | null;

// 100% stacked bars: what viewers did with each reel. Legend always shown,
// percentages labeled only where they fit, per-segment tooltip, table view.
export default function OutcomeBars({ rows: all }: { rows: ReelTotals[] }) {
  const [hover, setHover] = useState<Hover>(null);
  const [asTable, setAsTable] = useState(false);
  // Shares of nothing aren't shown: reels nobody has watched yet are left out.
  const rows = all.filter((r) => r.views > 0);
  if (!rows.length) return <p className="text-sm text-gray-600">Nobody has watched a reel in this period yet.</p>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-700" role="list" aria-label="Legend">
          {outcomes.map((o) => (
            <li key={o.key} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: o.color }} aria-hidden="true" />
              {o.label}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setAsTable((t) => !t)}
          className="min-h-11 rounded-md border border-gray-300 px-3 text-xs font-semibold text-deep-navy hover:bg-soft-gray"
          aria-pressed={asTable}
        >
          {asTable ? "Show chart" : "Show as table"}
        </button>
      </div>

      {asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="py-2 pr-4 font-semibold">Reel</th>
                <th className="py-2 pr-4 text-right font-semibold">Views</th>
                {outcomes.map((o) => (
                  <th key={o.key} className="py-2 pr-4 text-right font-semibold">{o.label}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
              {rows.map((r) => (
                <tr key={r.reel.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4">{r.reel.title}</td>
                  <td className="py-2 pr-4 text-right">{formatNumber(r.views)}</td>
                  {outcomes.map((o) => (
                    <td key={o.key} className="py-2 pr-4 text-right">
                      {formatPercent(r[o.key] / r.views)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="space-y-4" role="list">
          {rows.map((r) => (
            <li key={r.reel.id} className="grid gap-1.5 md:grid-cols-[minmax(0,15rem)_1fr] md:items-center md:gap-4">
              <p className="truncate text-sm text-gray-700" title={r.reel.title}>
                {r.reel.title}
              </p>
              <div className="relative flex h-6 gap-[2px]" role="group" aria-label={`${r.reel.title}: ${formatNumber(r.views)} views`}>
                {outcomes.map((o, i) => {
                  const share = r[o.key] / r.views;
                  const isHover = hover?.reelId === r.reel.id && hover.key === o.key;
                  return (
                    <button
                      type="button"
                      key={o.key}
                      className={`relative h-full min-w-0 outline-none transition-[filter] focus-visible:ring-2 focus-visible:ring-deep-navy ${
                        i === outcomes.length - 1 ? "rounded-r" : ""
                      } ${isHover ? "brightness-110" : ""}`}
                      style={{ flexGrow: share, flexBasis: 0, background: o.color }}
                      aria-label={`${o.label}: ${formatPercent(share)} (${formatNumber(r[o.key])})`}
                      onPointerEnter={() => setHover({ reelId: r.reel.id, key: o.key })}
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => setHover({ reelId: r.reel.id, key: o.key })}
                      onBlur={() => setHover(null)}
                    >
                      {/* Label only when it fits comfortably */}
                      {share >= 0.12 && (
                        <span
                          className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold"
                          style={{ color: labelInk(o.color) }}
                          aria-hidden="true"
                        >
                          {formatPercent(share)}
                        </span>
                      )}
                      {isHover && (
                        <span
                          role="status"
                          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-xs shadow-md"
                        >
                          <span className="block text-sm font-bold text-deep-navy">
                            {formatPercent(share)} &middot; {formatNumber(r[o.key])}
                          </span>
                          <span className="flex items-center gap-1.5 text-gray-600">
                            <span className="inline-block h-0.5 w-3" style={{ background: o.color }} aria-hidden="true" />
                            {o.label}
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
