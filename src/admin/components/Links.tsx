"use client";

import { useState, useSyncExternalStore } from "react";
import { sourceTotals } from "@/admin/sample-data";
import { formatNumber, viz } from "@/admin/viz";
import { defaultFunnel, getReel, reels } from "@/data/reels";
import { normalizeSourceTag, SOURCE_PRESETS, sourceLabel } from "@/lib/source-tag";

const ranges = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

const CUSTOM = "__custom";

// The page's own origin, so built links point at wherever the site is hosted.
const useOrigin = () =>
  useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  );

export default function Links() {
  const origin = useOrigin();
  const [preset, setPreset] = useState<string>(SOURCE_PRESETS[0].tag);
  const [custom, setCustom] = useState("");
  const [start, setStart] = useState("");
  const [copied, setCopied] = useState(false);
  const [range, setRange] = useState(ranges[1]);

  const customTag = normalizeSourceTag(custom.replace(/\s+/g, "-"));
  const tag = preset === CUSTOM ? customTag : preset;
  const query = new URLSearchParams();
  if (tag) query.set("src", tag);
  if (start) query.set("start", start);
  const path = `/f/${defaultFunnel.slug}${query.size ? `?${query}` : ""}`;
  const url = `${origin}${path}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is still selectable on screen.
    }
  };

  const rows = sourceTotals(range.days)
    .map((r) => ({ ...r, per100: ((r.calls + r.bookings) / r.visitors) * 100 }))
    .sort((a, b) => b.per100 - a.per100);
  const maxPer100 = Math.max(...rows.map((r) => r.per100));
  const totals = rows.reduce(
    (t, r) => ({
      visitors: t.visitors + r.visitors,
      calls: t.calls + r.calls,
      bookings: t.bookings + r.bookings,
      textLater: t.textLater + r.textLater,
    }),
    { visitors: 0, calls: 0, bookings: 0, textLater: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-deep-navy">Share links</h1>
        <p className="text-sm text-gray-600">
          The reel funnel as its own link. Give each place you share it its own tag, so you can see which one brings calls.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="builder-title">
        <h2 id="builder-title" className="mb-4 text-base font-bold text-deep-navy">Build a link</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="link-source" className="mb-1 block text-sm font-semibold text-deep-navy">
              Where will you share it?
            </label>
            <select id="link-source" className="form-input text-sm" value={preset} onChange={(e) => { setPreset(e.target.value); setCopied(false); }}>
              {SOURCE_PRESETS.map((p) => (
                <option key={p.tag} value={p.tag}>{p.label}</option>
              ))}
              <option value={CUSTOM}>Somewhere else...</option>
            </select>
            {preset === CUSTOM && (
              <div className="mt-2">
                <label htmlFor="link-custom" className="sr-only">Tag name</label>
                <input
                  id="link-custom"
                  className="form-input text-sm"
                  placeholder="e.g. bus-bench or chiro-partner"
                  maxLength={40}
                  value={custom}
                  onChange={(e) => { setCustom(e.target.value); setCopied(false); }}
                  aria-describedby="link-custom-help"
                />
                <p id="link-custom-help" className="mt-1 text-xs text-gray-600">
                  {custom && !customTag
                    ? "Use letters, numbers and dashes, starting with a letter or number."
                    : "Letters, numbers and dashes."}
                </p>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="link-start" className="mb-1 block text-sm font-semibold text-deep-navy">
              Opens on
            </label>
            <select id="link-start" className="form-input text-sm" value={start} onChange={(e) => { setStart(e.target.value); setCopied(false); }}>
              <option value="">&ldquo;What happened?&rdquo; topic choices</option>
              {reels.map((r) => (
                <option key={r.id} value={r.id}>Video: {r.title}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-600">
              Start on one video for a post or follow-up text about that topic.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 rounded-lg bg-soft-gray p-3 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 break-all text-sm text-deep-navy" aria-label="Your link">
            {url}
          </code>
          <div className="flex gap-2">
            <button type="button" onClick={copy} className="min-h-11 rounded-md bg-teal-accent px-4 text-sm font-bold text-white hover:brightness-110">
              <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
            </button>
            <a href={path} target="_blank" rel="noopener" className="flex min-h-11 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-gray-50">
              Open
            </a>
          </div>
        </div>
        {start && (
          <p className="mt-2 text-xs text-gray-600">
            Opens on &ldquo;{getReel(start)?.title}&rdquo;, then follows the funnel&apos;s paths from there.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="sources-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="sources-title" className="text-base font-bold text-deep-navy">Which links bring calls</h2>
            <p className="text-sm text-gray-600">
              Calls and call-back requests per 100 visitors, by where the link was shared. Sample data.
            </p>
          </div>
          <div className="flex rounded-md border border-gray-300 bg-white p-1" role="group" aria-label="Date range">
            {ranges.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range.days === r.days}
                className={`min-h-9 rounded px-3 text-sm font-semibold transition-colors ${range.days === r.days ? "bg-deep-navy text-white" : "text-gray-700 hover:bg-soft-gray"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="py-2 pr-4 font-semibold">Source</th>
                <th className="py-2 pr-4 text-right font-semibold">Visitors</th>
                <th className="py-2 pr-4 text-right font-semibold">Calls</th>
                <th className="py-2 pr-4 text-right font-semibold">Call-backs</th>
                <th className="py-2 pr-4 text-right font-semibold">Text me later</th>
                <th className="w-64 py-2 font-semibold">Calls + call-backs per 100</th>
              </tr>
            </thead>
            <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
              {rows.map((r) => (
                <tr key={r.tag ?? "direct"} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4">
                    <span className="font-medium text-deep-navy">{sourceLabel(r.tag)}</span>
                    {r.tag && <span className="ml-2 text-xs text-gray-500">src={r.tag}</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-right">{formatNumber(r.visitors)}</td>
                  <td className="py-2.5 pr-4 text-right">{formatNumber(r.calls)}</td>
                  <td className="py-2.5 pr-4 text-right">{formatNumber(r.bookings)}</td>
                  <td className="py-2.5 pr-4 text-right">{formatNumber(r.textLater)}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-3 flex-1 rounded-sm" style={{ background: viz.grid }} aria-hidden="true">
                        <div className="h-3 rounded-sm" style={{ width: `${(r.per100 / maxPer100) * 100}%`, background: viz.series1 }} />
                      </div>
                      <span className="w-10 text-right font-semibold text-deep-navy">{r.per100.toFixed(1)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{ fontVariantNumeric: "tabular-nums" }}>
              <tr className="font-semibold text-deep-navy">
                <td className="py-2.5 pr-4">All sources</td>
                <td className="py-2.5 pr-4 text-right">{formatNumber(totals.visitors)}</td>
                <td className="py-2.5 pr-4 text-right">{formatNumber(totals.calls)}</td>
                <td className="py-2.5 pr-4 text-right">{formatNumber(totals.bookings)}</td>
                <td className="py-2.5 pr-4 text-right">{formatNumber(totals.textLater)}</td>
                <td className="py-2.5 text-right">
                  {(((totals.calls + totals.bookings) / totals.visitors) * 100).toFixed(1)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-600">
          &ldquo;Text me later&rdquo; requests get the next video by text and aren&apos;t counted as calls until they call or book.
        </p>
      </section>
    </div>
  );
}
