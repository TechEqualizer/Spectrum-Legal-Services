"use client";

import { useState } from "react";
import { CTA_LABELS, TRIGGER_LABELS, type EditorFunnel, type EditorReel, type PathTarget } from "@/admin/editor-model";
import type { ReelTotals } from "@/admin/sample-data";
import { formatNumber, formatPercent } from "@/admin/viz";
import type { FunnelTrigger } from "@/data/reels";
import { thumbnailOf } from "@/lib/media";

/** One reel in the funnel's order: its place, cover, chips, where it leads, results and actions. */
type ReelRowProps = {
  /** The date this reel sells tickets for, e.g. "Oct 4". */
  date?: string;
  /** A drafted video prompt waits for this reel. */
  hasPrompt: boolean;
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

export default function ReelRow({ date, hasPrompt, stats: s, reel, index, count, funnel, unreachable, dragging, pathLabel, onDragStart, onDragEnd, onDropHere, onMove, onEdit, onPlay, onRemove }: ReelRowProps) {
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
      className={`flex flex-col gap-3 border-b border-gray-100 px-3 py-4 last:border-b-0 @2xl:flex-row @2xl:items-center @2xl:px-5 ${dragging ? "opacity-40" : ""} ${over ? "bg-sky-accent/10" : ""}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="hidden cursor-grab text-gray-400 @2xl:block" aria-hidden="true">
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
            {date && <Chip tone="teal">{date}</Chip>}
            {reel.emphasis === "quiet" && <Chip>Quiet</Chip>}
            {reel.emphasis === "bold" && <Chip tone="navy">Bold</Chip>}
            {!reel.media && <Chip tone="amber">{hasPrompt ? "Needs video" : "No video yet"}</Chip>}
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

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pl-12 @2xl:flex-nowrap @2xl:pl-0">
        {/* Phones: one line of text; wider screens: three columns. */}
        <p className="text-xs text-gray-600 @2xl:hidden" style={{ fontVariantNumeric: "tabular-nums" }}>
          {s
            ? `${formatNumber(s.views)} views · ${formatPercent(s.completed / s.views)} watched · ${formatNumber(s.booked)} booked`
            : "No results yet"}
        </p>
        <dl className="hidden grid-cols-3 gap-4 text-right text-xs @2xl:grid" style={{ fontVariantNumeric: "tabular-nums" }}>
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
        <span className="absolute inset-x-0 bottom-0 bg-red-700 py-0.5 text-center text-[11px] font-bold uppercase text-white">
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
