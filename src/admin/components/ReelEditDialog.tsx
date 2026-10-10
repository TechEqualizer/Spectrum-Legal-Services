"use client";

import { useEffect, useId, useRef, useState } from "react";
import MediaPicker from "@/admin/components/MediaPicker";
import VideoPrompt from "@/admin/components/VideoPrompt";
import {
  CTA_LABELS,
  type EditorFunnel,
  type EditorReel,
  type PathTarget,
  type ReelCta,
} from "@/admin/editor-model";
import type { ReelEmphasis, ReelMedia } from "@/data/funnel-types";
import type { FunnelTrigger } from "@/data/reels";
import { CONTENT_RULE } from "@/lib/content-rule";
import { REEL_DRIVERS, REEL_ROLES } from "@/lib/funnel-draft";

export type ReelEditResult = {
  reel: EditorReel;
  paths: Partial<Record<FunnelTrigger, PathTarget>>;
  /** Topic choice label, or undefined when it isn't a topic choice. */
  topic?: string;
};

type ReelEditDialogProps = {
  /** The reel being edited; a new reel has an empty id. */
  reel: EditorReel;
  funnel: EditorFunnel;
  library: EditorReel[];
  /** What a reel can be about, and what to call that. */
  services: readonly string[];
  topicLabel: string;
  /** The event's dates, for "Sells tickets for" (event funnels only). */
  dates?: { id: string; label: string }[];
  /** A drafted prompt for making this reel's video. */
  videoPrompt?: string;
  onSave: (result: ReelEditResult) => void;
  onClose: () => void;
};

export const EMPHASIS_LABELS: Record<ReelEmphasis, { label: string; help: string }> = {
  builds: { label: "Builds up (default)", help: "Book starts quiet and fills with your color partway through." },
  quiet: { label: "Quiet", help: "For teaching reels: no Book pill, and the rail stays plain." },
  bold: { label: "Bold", help: "For pricing or consultation reels: highlighted from the start." },
};

const TRIGGERS: { id: FunnelTrigger; label: string }[] = [
  { id: "completed", label: "When watched to the end" },
  { id: "skipped", label: "When skipped" },
];

export default function ReelEditDialog({ reel, funnel, library, services, topicLabel, dates, videoPrompt, onSave, onClose }: ReelEditDialogProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isNew = reel.id === "";
  const [draft, setDraft] = useState({
    title: reel.title,
    summary: reel.summary,
    practiceArea: reel.practiceArea,
    cta: reel.cta,
    emphasis: reel.emphasis ?? "builds",
    eventId: reel.eventId ?? "",
    fans: reel.visibility === "fans",
  });
  const [media, setMedia] = useState<ReelMedia | undefined>(reel.media);
  const [paths, setPaths] = useState(funnel.paths[reel.id] ?? {});
  const [isTopic, setIsTopic] = useState(reel.id in funnel.topics);
  const [topic, setTopic] = useState(funnel.topics[reel.id] ?? reel.practiceArea);
  const [error, setError] = useState("");

  // Opened as a modal dialog: the browser traps focus and closes it on Escape.
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  // Where "next in order" goes from this reel, for the option label.
  const position = isNew ? funnel.order.length : funnel.order.indexOf(reel.id);
  const nextId = funnel.order[position + 1];
  const nextTitle = nextId ? library.find((r) => r.id === nextId)?.title : undefined;
  const others = funnel.order.filter((rid) => rid !== reel.id);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return setError("Give the reel a title.");
    onSave({
      reel: {
        // Keeps what this dialog doesn't edit (the reel's event, badge, length).
        ...reel,
        id: reel.id,
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        practiceArea: draft.practiceArea,
        cta: draft.cta,
        emphasis: draft.emphasis === "builds" ? undefined : draft.emphasis,
        eventId: draft.eventId || undefined,
        media,
        visibility: draft.fans ? "fans" : undefined,
      },
      paths,
      topic: isTopic ? topic.trim() || draft.practiceArea : undefined,
    });
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      className="m-auto max-h-[92dvh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-xl bg-white p-0 text-charcoal shadow-2xl backdrop:bg-deep-navy/60"
    >
      <form onSubmit={save} className="space-y-6 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={`${id}-title`} className="text-xl font-black uppercase tracking-tight text-deep-navy">
              {isNew ? (reel.role ? `Add ${REEL_ROLES[reel.role]}` : "Add reel") : reel.role ? `Edit ${REEL_ROLES[reel.role]}` : "Edit reel"}
            </h2>
            {reel.role && (
              <p className="mt-1 text-sm text-gray-600">
                Answers &ldquo;{REEL_DRIVERS[reel.role].question}&rdquo; {REEL_DRIVERS[reel.role].driver}.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="-mr-2 -mt-1 flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-soft-gray hover:text-deep-navy"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content: shared by every funnel the reel is in */}
        <fieldset className="space-y-4">
          <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-600">Content</legend>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-deep-navy">Title</span>
              <input className="form-input text-sm" required maxLength={120} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-deep-navy">{topicLabel}</span>
              <select className="form-input text-sm" value={draft.practiceArea} onChange={(e) => set({ practiceArea: e.target.value })}>
                {services.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-deep-navy">Summary</span>
            <textarea className="form-input min-h-20 text-sm" maxLength={300} value={draft.summary} onChange={(e) => set({ summary: e.target.value })} />
          </label>
          <MediaPicker value={media} onChange={setMedia} />
          <FansOnly id={id} on={draft.fans} media={media} onChange={(fans) => set({ fans })} />
          {videoPrompt && <VideoPrompt prompt={videoPrompt} />}
          {dates && (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-deep-navy">Sells tickets for</span>
              <select className="form-input text-sm" value={draft.eventId} onChange={(e) => set({ eventId: e.target.value })} aria-describedby={`${id}-event-help`}>
                <option value="">No date: the next one on sale</option>
                {dates.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
              <span id={`${id}-event-help`} className="mt-1 block text-xs text-gray-600">
                Its Tickets button sells this date, and tapping the date on your opening screen can play it.
              </span>
            </label>
          )}
          <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-deep-navy">Main button</span>
            <select className="form-input text-sm" value={draft.cta} onChange={(e) => set({ cta: e.target.value as ReelCta })}>
              {(Object.keys(CTA_LABELS) as ReelCta[]).map((c) => (
                <option key={c} value={c}>
                  {c === "funnel" ? `Funnel default (${CTA_LABELS[funnel.primaryCta]})` : CTA_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-deep-navy">Selling</span>
            <select
              className="form-input text-sm"
              value={draft.emphasis}
              onChange={(e) => set({ emphasis: e.target.value as ReelEmphasis })}
              aria-describedby={`${id}-emphasis-help`}
            >
              {(Object.keys(EMPHASIS_LABELS) as ReelEmphasis[]).map((e) => (
                <option key={e} value={e}>{EMPHASIS_LABELS[e].label}</option>
              ))}
            </select>
            <span id={`${id}-emphasis-help`} className="mt-1 block text-xs text-gray-600">
              {EMPHASIS_LABELS[draft.emphasis].help}
            </span>
          </label>
          </div>
        </fieldset>

        {/* Funnel-specific: paths and topic choice */}
        <fieldset className="space-y-4 border-t border-gray-100 pt-5">
          <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-600">
            In &ldquo;{funnel.name}&rdquo;
          </legend>
          <div className="grid gap-4 md:grid-cols-2">
            {TRIGGERS.map((t) => (
              <label key={t.id} className="block">
                <span className="mb-1 block text-sm font-semibold text-deep-navy">{t.label}</span>
                <select
                  className="form-input text-sm"
                  value={paths[t.id] ?? "next"}
                  onChange={(e) => {
                    const value = e.target.value as PathTarget;
                    setPaths((p) => {
                      const nextPaths = { ...p };
                      if (value === "next") delete nextPaths[t.id];
                      else nextPaths[t.id] = value;
                      return nextPaths;
                    });
                  }}
                >
                  <option value="next">
                    Next in order{nextTitle ? `: ${nextTitle}` : " (end card)"}
                  </option>
                  <option value="end">End card: call, book or text</option>
                  {others.map((rid) => (
                    <option key={rid} value={rid}>
                      {funnel.order.indexOf(rid) + 1}. {library.find((r) => r.id === rid)?.title}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-deep-navy">
              <input type="checkbox" className="h-5 w-5 accent-teal-accent" checked={isTopic} onChange={(e) => setIsTopic(e.target.checked)} />
              Show as a &ldquo;What happened?&rdquo; choice
            </label>
            {isTopic && (
              <label className="flex flex-1 items-center gap-2 text-sm">
                <span className="sr-only">Choice label</span>
                <input className="form-input py-2 text-sm" maxLength={40} value={topic} onChange={(e) => setTopic(e.target.value)} />
              </label>
            )}
          </div>
        </fieldset>

        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <p className="mr-auto text-xs text-gray-500">Saved in this browser.</p>
          <button type="button" onClick={() => dialogRef.current?.close()} className="min-h-11 rounded-md border border-gray-300 px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray">
            Cancel
          </button>
          <button type="submit" className="min-h-11 rounded-md bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue">
            {isNew ? "Add reel" : "Save reel"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/**
 * The "Fans only" switch, with the content rule beside it. Files added while
 * it's on go to private storage when published; media that's already at a
 * public address (or on YouTube) stays reachable there, so it says so.
 */
function FansOnly({ id, on, media, onChange }: { id: string; on: boolean; media: ReelMedia | undefined; onChange: (on: boolean) => void }) {
  const src = media && "src" in media ? media.src : undefined;
  const publicAlready = on && media && (media.kind === "youtube" || (src && !src.startsWith("blob:") && !src.startsWith("fans:")));
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <span>
          <span id={`${id}-fans-label`} className="block text-sm font-semibold text-deep-navy">Fans only</span>
          <span id={`${id}-fans-help`} className="mt-0.5 block text-xs text-gray-600">
            Only people who follow you can watch it. Everyone else sees a locked card that asks them to follow.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={`${id}-fans-label`}
          aria-describedby={`${id}-fans-help${on ? ` ${id}-fans-rule` : ""}`}
          onClick={() => onChange(!on)}
          className={`relative mt-0.5 inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-accent motion-reduce:transition-none ${
            on ? "bg-teal-accent" : "bg-gray-300"
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${on ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
      </div>
      {on && (
        <div id={`${id}-fans-rule`} className="mt-3 rounded-md bg-soft-gray px-3 py-2.5 text-xs text-gray-700">
          <p className="font-semibold text-deep-navy">{CONTENT_RULE.summary}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {CONTENT_RULE.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      )}
      {publicAlready && (
        <p role="status" className="mt-3 text-xs font-semibold text-amber-800">
          {media?.kind === "youtube"
            ? "Anyone with the YouTube link can still watch this video. For a private reel, upload the file instead."
            : "This file is already at a public address. Upload it again to keep it private: files added while Fans only is on go to private storage."}
        </p>
      )}
    </div>
  );
}
