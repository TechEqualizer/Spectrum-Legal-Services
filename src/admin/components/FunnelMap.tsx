"use client";

import { useMemo, useState } from "react";
import { useAdminBusiness } from "@/admin/AdminBusiness";
import { sampleFor } from "@/admin/sample-data";
import { formatNumber, formatPercent } from "@/admin/viz";
import { funnelReel, type Funnel, type FunnelTrigger } from "@/data/reels";

const END = "__end__";
const NODE_W = 200;
const NODE_H = 112;
const COL_GAP = 64;
const ROW_GAP = 20;
const PAD = 24;
// Extra room on the left for the "skipped" arcs between entry reels.
const PAD_LEFT = 64;

const WATCHED = "var(--teal-accent)"; // the brand's accent: UI wiring, not data
const SKIPPED = "#9a9993";

type Links = Funnel["links"];
type NodePos = { id: string; x: number; y: number };

// Columns follow the "watched" path: entry reels on the left, each watched
// step one column to the right, and the consultation card at the end.
function layout(funnel: Funnel, links: Links) {
  const ids = funnel.reels.map((r) => r.id);
  const depth = new Map<string, number>(funnel.entryReelIds.map((id) => [id, 0]));
  // Longest-path relaxation, capped so a loop can't run forever.
  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false;
    for (const id of ids) {
      const d = depth.get(id);
      const next = links[id]?.completed;
      if (d === undefined || !next || funnel.entryReelIds.includes(next)) continue;
      const nd = Math.min(d + 1, ids.length);
      if ((depth.get(next) ?? -1) < nd) {
        depth.set(next, nd);
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const id of ids) if (!depth.has(id)) depth.set(id, 1);

  const columns: string[][] = [];
  for (const id of [...funnel.entryReelIds, ...ids.filter((i) => !funnel.entryReelIds.includes(i))]) {
    const c = depth.get(id)!;
    (columns[c] ??= []).push(id);
  }
  const filled = columns.filter(Boolean);
  filled.push([END]);
  const maxRows = Math.max(...filled.map((c) => c.length));
  const height = PAD * 2 + maxRows * NODE_H + (maxRows - 1) * ROW_GAP;

  const pos = new Map<string, NodePos>();
  filled.forEach((col, c) => {
    const colH = col.length * NODE_H + (col.length - 1) * ROW_GAP;
    const top = (height - colH) / 2;
    col.forEach((id, r) =>
      pos.set(id, { id, x: PAD_LEFT + c * (NODE_W + COL_GAP), y: top + r * (NODE_H + ROW_GAP) })
    );
  });
  const width = PAD_LEFT + PAD + filled.length * NODE_W + (filled.length - 1) * COL_GAP;
  return { pos, width, height };
}

function edgePath(a: NodePos, b: NodePos) {
  if (b.x > a.x) {
    // Forward: right edge to left edge.
    const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2, x2 = b.x - 6, y2 = b.y + NODE_H / 2;
    const mx = (x1 + x2) / 2;
    return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
  }
  if (b.x === a.x) {
    // Same column: arc out to the left side.
    const x1 = a.x, y1 = a.y + NODE_H / 2, x2 = b.x - 4, y2 = b.y + NODE_H / 2;
    const bulge = Math.min(60, 18 + Math.abs(y2 - y1) / 8);
    return `M${x1},${y1} C${x1 - bulge},${y1} ${x2 - bulge},${y2} ${x2},${y2}`;
  }
  // Backward: bottom of the source back to the target's right side.
  const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H, x2 = b.x + NODE_W + 6, y2 = b.y + NODE_H / 2;
  return `M${x1},${y1} C${x1},${y1 + 60} ${x2 + 80},${y2} ${x2},${y2}`;
}

export default function FunnelMap() {
  const business = useAdminBusiness();
  const { funnel } = business;
  const getReel = (id: string) => funnelReel(funnel, id);
  const [links, setLinks] = useState<Links>(funnel.links);
  const [selected, setSelected] = useState<string | null>(funnel.entryReelIds[0]);
  const stats = useMemo(
    () => new Map(sampleFor(business).reelTotals(30).map((t) => [t.reel.id, t])),
    [business]
  );
  const { pos, width, height } = useMemo(() => layout(funnel, links), [funnel, links]);
  const edited = JSON.stringify(links) !== JSON.stringify(funnel.links);
  const endCard = `\u201c${funnel.brand.copy.endHeading}\u201d card`;

  const edges = funnel.reels.flatMap((r) =>
    (["completed", "skipped"] as FunnelTrigger[]).map((trigger) => ({
      from: r.id,
      to: links[r.id]?.[trigger] ?? END,
      trigger,
    }))
  );

  const setLink = (id: string, trigger: FunnelTrigger, to: string) =>
    setLinks((prev) => ({
      ...prev,
      [id]: { ...prev[id], [trigger]: to === END ? null : to },
    }));

  const sel = selected ? getReel(selected) : undefined;
  const selStats = selected ? stats.get(selected) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-deep-navy">Paths</h1>
          <p className="text-sm text-gray-600">
            Funnel <code className="rounded bg-white px-1">{funnel.id}</code>. Click a reel to see
            its numbers and change where it leads.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-700">
          <span className="flex items-center gap-2">
            <svg width="28" height="8" aria-hidden="true"><line x1="0" y1="4" x2="28" y2="4" stroke={WATCHED} strokeWidth="2" /></svg>
            When watched
          </span>
          <span className="flex items-center gap-2">
            <svg width="28" height="8" aria-hidden="true"><line x1="0" y1="4" x2="28" y2="4" stroke={SKIPPED} strokeWidth="2" strokeDasharray="5 4" /></svg>
            When skipped
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <div className="relative mx-auto" style={{ width, height }}>
            <svg className="absolute inset-0" width={width} height={height} aria-hidden="true">
              <defs>
                {[["watched", WATCHED], ["skipped", SKIPPED]].map(([id, color]) => (
                  <marker key={id} id={`arrow-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill={color} />
                  </marker>
                ))}
              </defs>
              {edges.map((e) => {
                const a = pos.get(e.from), b = pos.get(e.to);
                if (!a || !b) return null;
                const watched = e.trigger === "completed";
                const focus = selected === null || selected === e.from;
                return (
                  <path
                    key={`${e.from}-${e.trigger}`}
                    d={edgePath(a, b)}
                    fill="none"
                    stroke={watched ? WATCHED : SKIPPED}
                    strokeWidth={focus && selected ? 2.5 : 2}
                    strokeDasharray={watched ? undefined : "6 5"}
                    markerEnd={`url(#arrow-${watched ? "watched" : "skipped"})`}
                    opacity={focus ? (watched || selected ? 1 : 0.55) : 0.15}
                  />
                );
              })}
            </svg>

            {[...pos.values()].map((p) => {
              if (p.id === END) {
                return (
                  <div
                    key={END}
                    className="absolute flex flex-col justify-center rounded-lg border-2 border-dashed border-teal-accent bg-teal-accent/5 px-4"
                    style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-teal-accent">End of funnel</p>
                    <p className="text-sm font-semibold text-deep-navy">{endCard}</p>
                    <p className="text-xs text-gray-600">Offers &ldquo;{funnel.brand.copy.bookPrimary}&rdquo;</p>
                  </div>
                );
              }
              const reel = getReel(p.id)!;
              const s = stats.get(p.id);
              const isEntry = funnel.entryReelIds.includes(p.id);
              const active = selected === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(active ? null : p.id)}
                  aria-pressed={active}
                  className={`absolute flex flex-col justify-between rounded-lg border bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md ${
                    active ? "border-deep-navy ring-2 ring-deep-navy" : "border-gray-200"
                  }`}
                  style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] font-bold uppercase tracking-wider text-teal-accent">
                      {reel.practiceArea}
                    </span>
                    {isEntry && (
                      <span className="flex-shrink-0 rounded bg-soft-gray px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                        Entry
                      </span>
                    )}
                  </span>
                  <span className="my-1 line-clamp-2 text-sm font-semibold leading-snug text-deep-navy">{reel.title}</span>
                  {s && (
                    <span className="text-xs text-gray-600" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatNumber(s.views)} views &middot; {formatPercent(s.completed / s.views)} watched
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail / editor panel */}
        <aside className="rounded-xl border border-gray-200 bg-white p-5" aria-live="polite">
          {sel && selStats ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-teal-accent">{sel.practiceArea}</p>
                <h2 className="mt-1 text-lg font-bold leading-snug text-deep-navy">{sel.title}</h2>
                <p className="mt-2 text-sm text-gray-600">{sel.summary}</p>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center" style={{ fontVariantNumeric: "tabular-nums" }}>
                {[
                  ["Views", formatNumber(selStats.views)],
                  ["Watched", formatPercent(selStats.completed / selStats.views)],
                  ["Booked", formatNumber(selStats.booked)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md bg-soft-gray px-2 py-3">
                    <dt className="text-[11px] uppercase tracking-wide text-gray-600">{k}</dt>
                    <dd className="text-lg font-bold text-deep-navy">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="-mt-3 text-xs text-gray-500">Last 30 days, sample data</p>
              </div>
              <div className="space-y-5">

              {(["completed", "skipped"] as FunnelTrigger[]).map((trigger) => (
                <label key={trigger} className="block">
                  <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-deep-navy">
                    <svg width="22" height="8" aria-hidden="true">
                      <line x1="0" y1="4" x2="22" y2="4" stroke={trigger === "completed" ? WATCHED : SKIPPED} strokeWidth="2" strokeDasharray={trigger === "completed" ? undefined : "5 4"} />
                    </svg>
                    {trigger === "completed" ? "When watched to the end, show" : "When skipped, show"}
                  </span>
                  <select
                    className="form-input text-sm"
                    value={links[sel.id]?.[trigger] ?? END}
                    onChange={(e) => setLink(sel.id, trigger, e.target.value)}
                  >
                    <option value={END}>End: {endCard}</option>
                    {funnel.reels.filter((r) => r.id !== sel.id).map((r) => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                </label>
              ))}

              <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  disabled
                  className="min-h-11 rounded-md bg-teal-accent px-4 text-sm font-bold text-white opacity-50"
                  title="Publishing comes with the admin login"
                >
                  Publish changes
                </button>
                {edited && (
                  <button
                    type="button"
                    onClick={() => setLinks(funnel.links)}
                    className="min-h-11 rounded-md border border-gray-300 px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray"
                  >
                    Reset to live paths
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Preview only: edits redraw the map but aren&apos;t saved, and the live site keeps its current paths.
              </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Select a reel in the map to see its numbers and edit where it leads.</p>
          )}
        </aside>
      </div>

      {/* The same paths as a table, for small screens and screen readers */}
      <section className="rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="paths-title">
        <h2 id="paths-title" className="mb-4 text-base font-bold text-deep-navy">All paths</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="py-2 pr-4 font-semibold">Reel</th>
                <th className="py-2 pr-4 font-semibold">When watched</th>
                <th className="py-2 font-semibold">When skipped</th>
              </tr>
            </thead>
            <tbody>
              {funnel.reels.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 font-medium text-deep-navy">{r.title}</td>
                  {(["completed", "skipped"] as FunnelTrigger[]).map((t) => {
                    const to = links[r.id]?.[t];
                    return (
                      <td key={t} className="py-2.5 pr-4 text-gray-700">
                        {to ? getReel(to)?.title : <span className="text-teal-accent">End card</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
