"use client";

import { useState } from "react";
import ReelEditDialog, { type ReelEditResult } from "@/admin/components/ReelEditDialog";
import ReelViewer from "@/components/ReelViewer";
import {
  CTA_LABELS,
  ENTRY_TRIGGERS,
  initialEditorState,
  removeFromFunnel,
  toPreviewFunnel,
  resolveNext,
  type EditorFunnel,
  type EditorReel,
  type PathTarget,
} from "@/admin/editor-model";
import { useAdminBusiness } from "@/admin/AdminBusiness";
import { sampleFor, type ReelTotals } from "@/admin/sample-data";
import { formatNumber, formatPercent } from "@/admin/viz";
import type { FunnelTrigger } from "@/data/reels";
import { thumbnailOf } from "@/lib/media";


const blankReel: EditorReel = {
  id: "",
  title: "",
  summary: "",
  practiceArea: "Car Accident",
  cta: "funnel",
};

function slugify(title: string, taken: Set<string>) {
  const base =
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "reel";
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** Reels a visitor can reach from the funnel's starting points. */
function reachable(funnel: EditorFunnel) {
  const starts = Object.keys(funnel.topics).filter((id) => funnel.order.includes(id));
  const queue = starts.length ? starts : funnel.order.slice(0, 1);
  const seen = new Set<string>(queue);
  while (queue.length) {
    const id = queue.shift()!;
    for (const trigger of ["completed", "skipped"] as const) {
      const next = resolveNext(funnel, id, trigger);
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

export default function ReelsEditor() {
  const business = useAdminBusiness();
  const liveFunnel = business.funnel;
  // The admin remounts this page when the business changes, so this runs once per business.
  const [initial] = useState(() => initialEditorState(business));
  const [library, setLibrary] = useState(initial.reels);
  const [funnels, setFunnels] = useState(initial.funnels);
  const [activeId, setActiveId] = useState(initial.funnels[0].id);
  // Sample results for the last 30 days, keyed by reel.
  const stats = new Map(sampleFor(business).reelTotals(30).map((t) => [t.reel.id, t]));
  const [editing, setEditing] = useState<EditorReel | null>(null);
  // Plays the funnel as edited, from one of its reels.
  const [preview, setPreview] = useState<{ reelId: string; key: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [addId, setAddId] = useState("");
  // Read out after a move, for keyboard and screen reader users.
  const [announcement, setAnnouncement] = useState("");

  const funnel = funnels.find((f) => f.id === activeId)!;
  const byId = new Map(library.map((r) => [r.id, r]));
  const reach = reachable(funnel);
  const notInFunnel = library.filter((r) => !funnel.order.includes(r.id));

  const updateFunnel = (patch: Partial<EditorFunnel> | ((f: EditorFunnel) => EditorFunnel)) =>
    setFunnels((all) =>
      all.map((f) => {
        if (f.id !== activeId) {
          // Only one funnel can be the default.
          return typeof patch !== "function" && patch.isDefault ? { ...f, isDefault: false } : f;
        }
        return typeof patch === "function" ? patch(f) : { ...f, ...patch };
      })
    );

  const moveTo = (reelId: string, index: number) => {
    updateFunnel((f) => {
      const order = f.order.filter((id) => id !== reelId);
      order.splice(Math.max(0, Math.min(index, order.length)), 0, reelId);
      return { ...f, order };
    });
    setAnnouncement(`${byId.get(reelId)?.title} moved to position ${index + 1}.`);
  };

  const save = ({ reel, paths, topic }: ReelEditResult) => {
    const isNew = reel.id === "";
    const id = isNew ? slugify(reel.title, new Set(library.map((r) => r.id))) : reel.id;
    const saved = { ...reel, id };
    setLibrary((all) => (isNew ? [...all, saved] : all.map((r) => (r.id === id ? saved : r))));
    updateFunnel((f) => {
      const topics = { ...f.topics };
      if (topic) topics[id] = topic;
      else delete topics[id];
      const nextPaths = { ...f.paths };
      if (Object.keys(paths).length) nextPaths[id] = paths;
      else delete nextPaths[id];
      return { ...f, order: isNew ? [...f.order, id] : f.order, topics, paths: nextPaths };
    });
    setEditing(null);
  };

  const newFunnel = () => {
    const f: EditorFunnel = {
      id: `funnel-${Date.now()}`,
      name: "New funnel",
      isDefault: false,
      entry: "returning",
      primaryCta: "call",
      order: [],
      topics: {},
      paths: {},
    };
    setFunnels((all) => [...all, f]);
    setActiveId(f.id);
  };

  const pathLabel = (target: PathTarget) => {
    if (target === "end") return "End card";
    const i = funnel.order.indexOf(target);
    return i === -1 ? "End card" : `${i + 1}. ${byId.get(target)?.title}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-deep-navy">Reels</h1>
          <p className="text-sm text-gray-600">
            Put reels in order. Each one goes to the next unless you give it a different path.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/f/${liveFunnel.slug}`}
            target="_blank"
            rel="noopener"
            className="flex min-h-11 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-gray-50"
          >
            Open live link
          </a>
          <button
            type="button"
            disabled={funnel.order.length === 0}
            onClick={() => setPreview({ reelId: funnel.order[0], key: Date.now() })}
            className="min-h-11 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-gray-50 disabled:opacity-40"
          >
            Preview edits
          </button>
          <button
            type="button"
            onClick={() => setEditing({ ...blankReel, practiceArea: liveFunnel.brand.services[0] })}
            className="min-h-11 rounded-md bg-deep-navy px-4 text-sm font-bold text-white hover:bg-royal-blue"
          >
            + Add reel
          </button>
        </div>
      </div>

      {/* Funnels: containers with an entry trigger */}
      <section aria-labelledby="funnels-title">
        <h2 id="funnels-title" className="sr-only">Funnels</h2>
        <ul className="flex gap-3 overflow-x-auto pb-1" role="list">
          {funnels.map((f) => {
            const active = f.id === activeId;
            return (
              <li key={f.id} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveId(f.id)}
                  aria-pressed={active}
                  className={`w-60 rounded-xl border p-4 text-left transition-colors ${active ? "border-deep-navy bg-white shadow-sm ring-1 ring-deep-navy" : "border-gray-200 bg-white hover:border-gray-400"}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate font-bold text-deep-navy">{f.name}</span>
                    {f.isDefault && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Default</span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-xs text-gray-600">
                    {ENTRY_TRIGGERS.find((t) => t.id === f.entry)?.label}
                  </span>
                  <span className="mt-2 block text-xs font-semibold text-gray-700">
                    {f.order.length} {f.order.length === 1 ? "reel" : "reels"} &middot; {CTA_LABELS[f.primaryCta]} first
                    {f.id === liveFunnel.id && <span className="ml-1 font-normal text-teal-accent">&middot; live</span>}
                  </span>
                </button>
              </li>
            );
          })}
          <li className="flex-shrink-0">
            <button
              type="button"
              onClick={newFunnel}
              className="flex h-full min-h-24 w-40 items-center justify-center rounded-xl border border-dashed border-gray-400 px-4 text-sm font-semibold text-deep-navy hover:bg-white"
            >
              + New funnel
            </button>
          </li>
        </ul>
      </section>

      {/* Settings for the selected funnel */}
      <section className="rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="settings-title">
        <h2 id="settings-title" className="sr-only">Funnel settings</h2>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_11rem]">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-deep-navy">Funnel name</span>
            <input className="form-input text-sm" value={funnel.name} onChange={(e) => updateFunnel({ name: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-deep-navy">Shown to</span>
            <select className="form-input text-sm" value={funnel.entry} onChange={(e) => updateFunnel({ entry: e.target.value as EditorFunnel["entry"] })}>
              {ENTRY_TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-deep-navy">Main button</span>
            <select className="form-input text-sm" value={funnel.primaryCta} onChange={(e) => updateFunnel({ primaryCta: e.target.value as EditorFunnel["primaryCta"] })}>
              <option value="call">Call</option>
              <option value="book">Book</option>
              <option value="tickets">Tickets</option>
            </select>
          </label>
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold text-deep-navy">
          <input
            type="checkbox"
            className="h-5 w-5 accent-teal-accent"
            checked={funnel.isDefault}
            onChange={(e) => updateFunnel({ isDefault: e.target.checked })}
          />
          Default funnel: shown when no other funnel matches the visitor
        </label>
      </section>

      {/* The ordered reel list */}
      <section className="rounded-xl border border-gray-200 bg-white" aria-labelledby="order-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 px-5 py-4">
          <h2 id="order-title" className="text-base font-bold text-deep-navy">Order</h2>
          <p className="text-xs text-gray-600">Drag to reorder, or use the arrows. Results are the last 30 days (sample).</p>
        </div>
        <p className="sr-only" aria-live="polite">{announcement}</p>
        {funnel.order.length === 0 ? (
          <p className="p-6 text-sm text-gray-600">No reels yet. Add one below or create a new reel.</p>
        ) : (
          <ol role="list">
            {funnel.order.map((id, i) => {
              const reel = byId.get(id);
              if (!reel) return null;
              return (
                <ReelRow
                  stats={stats.get(id)}
                  key={id}
                  reel={reel}
                  index={i}
                  count={funnel.order.length}
                  funnel={funnel}
                  unreachable={!reach.has(id)}
                  dragging={dragId === id}
                  pathLabel={pathLabel}
                  onDragStart={() => setDragId(id)}
                  onDragEnd={() => setDragId(null)}
                  onDropHere={() => dragId && dragId !== id && moveTo(dragId, i)}
                  onMove={(by) => moveTo(id, i + by)}
                  onEdit={() => setEditing(reel)}
                  onPlay={() => setPreview({ reelId: id, key: Date.now() })}
                  onRemove={() => updateFunnel((f) => removeFromFunnel(f, id))}
                />
              );
            })}
          </ol>
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-5 py-4">
          {notInFunnel.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="add-existing" className="text-sm font-semibold text-deep-navy">Add an existing reel</label>
              <select id="add-existing" className="form-input w-auto max-w-72 py-2 text-sm" value={addId} onChange={(e) => setAddId(e.target.value)}>
                <option value="">Choose a reel...</option>
                {notInFunnel.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
              <button
                type="button"
                disabled={!addId}
                onClick={() => {
                  updateFunnel((f) => ({ ...f, order: [...f.order, addId] }));
                  setAddId("");
                }}
                className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-semibold text-deep-navy hover:bg-soft-gray disabled:opacity-40"
              >
                Add
              </button>
            </div>
          )}
          <button type="button" disabled className="ml-auto min-h-11 rounded-md bg-teal-accent px-4 text-sm font-bold text-white opacity-50" title="Saving comes with the admin login">
            Publish changes
          </button>
          <p className="w-full text-right text-xs text-gray-500">Preview only: nothing is saved, and the live link doesn&apos;t change.</p>
        </div>
      </section>

      {preview && (
        <ReelViewer
          key={preview.key}
          funnel={toPreviewFunnel(liveFunnel, funnel, library)}
          startReelId={preview.reelId}
          onClose={() => setPreview(null)}
        />
      )}

      {editing && (
        <ReelEditDialog
          key={editing.id || "new"}
          reel={editing}
          funnel={funnel}
          library={library}
          services={liveFunnel.brand.services}
          topicLabel={business.terms.topic}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

type ReelRowProps = {
  stats: ReelTotals | undefined;
  reel: EditorReel;
  index: number;
  count: number;
  funnel: EditorFunnel;
  unreachable: boolean;
  dragging: boolean;
  pathLabel: (target: PathTarget) => string;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropHere: () => void;
  onMove: (by: -1 | 1) => void;
  onEdit: () => void;
  onPlay: () => void;
  onRemove: () => void;
};

const TRIGGER_LABELS: Record<FunnelTrigger, string> = {
  completed: "Watched",
  skipped: "Skipped",
};

function ReelRow({ stats: s, reel, index, count, funnel, unreachable, dragging, pathLabel, onDragStart, onDragEnd, onDropHere, onMove, onEdit, onPlay, onRemove }: ReelRowProps) {
  const [over, setOver] = useState(false);
  const overrides = Object.entries(funnel.paths[reel.id] ?? {}) as [FunnelTrigger, PathTarget][];
  const cta = reel.cta === "funnel" ? funnel.primaryCta : reel.cta;
  const topic = funnel.topics[reel.id];

  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDropHere();
      }}
      className={`flex flex-col gap-3 border-b border-gray-100 px-3 py-4 last:border-b-0 sm:flex-row sm:items-center sm:px-5 ${dragging ? "opacity-40" : ""} ${over ? "bg-sky-accent/10" : ""}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="hidden cursor-grab text-gray-400 sm:block" aria-hidden="true">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
          </svg>
        </span>
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-soft-gray text-sm font-bold text-deep-navy" style={{ fontVariantNumeric: "tabular-nums" }}>
          {index + 1}
        </span>
        <button type="button" onClick={onPlay} aria-label={`Preview ${reel.title}`} className="flex-shrink-0 rounded-md focus-visible:outline-2">
          <Thumb reel={reel} />
        </button>
        <div className="min-w-0">
          <p className="font-bold leading-snug text-deep-navy">{reel.title}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip>{reel.practiceArea}</Chip>
            <Chip tone="teal">{CTA_LABELS[cta]}</Chip>
            {topic && <Chip tone="navy">Topic: {topic}</Chip>}
            {reel.emphasis === "quiet" && <Chip>Quiet</Chip>}
            {reel.emphasis === "bold" && <Chip tone="navy">Bold</Chip>}
            {!reel.media && <Chip tone="amber">No video yet</Chip>}
            {reel.media?.kind === "youtube" && <Chip>YouTube</Chip>}
            {reel.media?.kind === "image" && <Chip>Photo</Chip>}
            {unreachable && <Chip tone="red">No path leads here</Chip>}
          </div>
          <p className="mt-1.5 text-xs text-gray-600">
            {overrides.length
              ? overrides.map(([trigger, target]) => `${TRIGGER_LABELS[trigger]} → ${pathLabel(target)}`).join(" · ")
              : index === count - 1
                ? "Then the end card"
                : "Then the next reel"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pl-12 sm:flex-nowrap sm:pl-0">
        {/* Phones: one line of text; wider screens: three columns. */}
        <p className="text-xs text-gray-600 sm:hidden" style={{ fontVariantNumeric: "tabular-nums" }}>
          {s
            ? `${formatNumber(s.views)} views · ${formatPercent(s.completed / s.views)} watched · ${formatNumber(s.booked)} booked`
            : "No results yet"}
        </p>
        <dl className="hidden grid-cols-3 gap-4 text-right text-xs sm:grid" style={{ fontVariantNumeric: "tabular-nums" }}>
          {s ? (
            <>
              <Stat label="Views" value={formatNumber(s.views)} />
              <Stat label="Watched" value={formatPercent(s.completed / s.views)} />
              <Stat label="Booked" value={formatNumber(s.booked)} />
            </>
          ) : (
            <p className="col-span-3 text-gray-500">No results yet</p>
          )}
        </dl>
        <div className="flex items-center">
          <IconButton label={`Move ${reel.title} up`} disabled={index === 0} onClick={() => onMove(-1)} d="M5 15l7-7 7 7" />
          <IconButton label={`Move ${reel.title} down`} disabled={index === count - 1} onClick={() => onMove(1)} d="M19 9l-7 7-7-7" />
          <IconButton label={`Edit ${reel.title}`} onClick={onEdit} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          <IconButton label={`Remove ${reel.title} from this funnel`} onClick={onRemove} d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" danger />
        </div>
      </div>
    </li>
  );
}

function Thumb({ reel }: { reel: EditorReel }) {
  const [broken, setBroken] = useState<string | null>(null);
  const poster = thumbnailOf(reel.media);
  const show = poster && broken !== poster;
  return (
    <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-deep-navy to-royal-blue">
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element -- any link the admin pastes
        <img src={poster} alt="" className="h-full w-full object-cover" onError={() => setBroken(poster)} />
      ) : (
        <svg className="absolute inset-0 m-auto h-5 w-5 text-sky-accent" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
      {poster && broken === poster && (
        <span className="absolute inset-x-0 bottom-0 bg-red-700 py-0.5 text-center text-[10px] font-bold uppercase text-white">
          Broken<span className="sr-only">: cover image didn&apos;t load</span>
        </span>
      )}
    </div>
  );
}

const chipTones = {
  gray: "border border-gray-200 bg-white text-gray-800",
  teal: "bg-teal-accent/10 text-teal-accent",
  navy: "bg-deep-navy text-white",
  amber: "bg-amber-50 text-amber-900",
  red: "bg-red-50 text-red-800",
};

function Chip({ children, tone = "gray" }: { children: React.ReactNode; tone?: keyof typeof chipTones }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${chipTones[tone]}`}>
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-sm font-bold text-deep-navy">{value}</dd>
    </div>
  );
}

function IconButton({ label, d, onClick, disabled, danger }: { label: string; d: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-md hover:bg-soft-gray disabled:opacity-30 ${danger ? "text-red-700" : "text-gray-600 hover:text-deep-navy"}`}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
        <path d={d} />
      </svg>
    </button>
  );
}
