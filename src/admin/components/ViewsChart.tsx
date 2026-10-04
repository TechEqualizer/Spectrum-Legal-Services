"use client";

import { useEffect, useRef, useState } from "react";
import { formatDay, formatNumber, niceTicks, viz } from "@/admin/viz";

type Point = { date: Date; views: number };

const HEIGHT = 240;
const M = { top: 16, right: 56, bottom: 28, left: 44 };

// Single-series line: no legend (the card title names it), crosshair + tooltip
// on hover, arrow keys move the readout, and the end value is labeled.
export default function ViewsChart({ data }: { data: Point[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(280, Math.round(entry.contentRect.width)))
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const innerW = width - M.left - M.right;
  const innerH = HEIGHT - M.top - M.bottom;
  // At least one step, so a period without views still draws a flat line.
  const ticks = niceTicks(Math.max(1, ...data.map((d) => d.views)));
  const yMax = ticks[ticks.length - 1];
  const x = (i: number) => M.left + (data.length === 1 ? 0 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => M.top + innerH - (v / yMax) * innerH;

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.views)}`).join("");
  const area = `${line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;

  // Up to five date labels, evenly spaced, as many as fit (about 72px each).
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.min(5, Math.floor(innerW / 72)))));
  const last = data.length - 1;

  const pick = (clientX: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const px = clientX - rect.left - M.left;
    const i = Math.round((px / innerW) * last);
    setActive(Math.min(last, Math.max(0, i)));
  };

  const shown = active ?? null;

  return (
    <div ref={wrapRef} className="relative">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Daily reel views, ${formatDay(data[0].date)} to ${formatDay(data[last].date)}. Latest: ${formatNumber(data[last].views)}.`}
        tabIndex={0}
        className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-teal-accent"
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((a) => Math.min(last, (a ?? last) + 1));
          else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? last) - 1));
          else return;
          e.preventDefault();
        }}
        onBlur={() => setActive(null)}
      >
        {/* Gridlines and y ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? viz.axis : viz.grid} strokeWidth={1} />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={viz.textSecondary} style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatNumber(t)}
            </text>
          </g>
        ))}
        {/* X labels */}
        {data.map((d, i) =>
          (i % labelEvery === 0 && last - i >= labelEvery / 2) || i === last ? (
            <text key={i} x={x(i)} y={HEIGHT - 8} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} fontSize={11} fill={viz.textSecondary}>
              {formatDay(d.date)}
            </text>
          ) : null
        )}

        <path d={area} fill={viz.series1} opacity={0.1} />
        <path d={line} fill="none" stroke={viz.series1} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* End marker and label */}
        <circle cx={x(last)} cy={y(data[last].views)} r={4} fill={viz.series1} stroke={viz.surface} strokeWidth={2} />
        <text x={x(last) + 8} y={y(data[last].views)} dy="0.32em" fontSize={12} fontWeight={600} fill={viz.textPrimary}>
          {formatNumber(data[last].views)}
        </text>

        {shown !== null && (
          <g pointerEvents="none">
            <line x1={x(shown)} x2={x(shown)} y1={M.top} y2={M.top + innerH} stroke={viz.textMuted} strokeWidth={1} />
            <circle cx={x(shown)} cy={y(data[shown].views)} r={4} fill={viz.series1} stroke={viz.surface} strokeWidth={2} />
          </g>
        )}
      </svg>

      {shown !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{
            left: Math.min(Math.max(x(shown) - 70, 0), width - 140),
            width: 140,
          }}
        >
          <p className="text-base font-bold text-deep-navy" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatNumber(data[shown].views)}
          </p>
          <p className="flex items-center gap-1.5 text-gray-600">
            <span className="inline-block h-0.5 w-3" style={{ background: viz.series1 }} aria-hidden="true" />
            Views &middot; {formatDay(data[shown].date)}
          </p>
        </div>
      )}
    </div>
  );
}
