"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  CTA_LABELS,
  isMediaUrl,
  type EditorFunnel,
  type EditorReel,
  type PathTarget,
  type ReelCta,
} from "@/admin/editor-model";
import type { FunnelTrigger } from "@/data/reels";
import { CASE_TYPES } from "@/lib/leads";

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
  onSave: (result: ReelEditResult) => void;
  onClose: () => void;
};

const TRIGGERS: { id: FunnelTrigger; label: string }[] = [
  { id: "completed", label: "When watched to the end" },
  { id: "skipped", label: "When skipped" },
];

export default function ReelEditDialog({ reel, funnel, library, onSave, onClose }: ReelEditDialogProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isNew = reel.id === "";
  const [draft, setDraft] = useState({
    title: reel.title,
    summary: reel.summary,
    practiceArea: reel.practiceArea,
    video: reel.video?.src ?? "",
    poster: reel.video?.poster ?? "",
    captions: reel.video?.captions ?? "",
    cta: reel.cta,
  });
  const [paths, setPaths] = useState(funnel.paths[reel.id] ?? {});
  const [isTopic, setIsTopic] = useState(reel.id in funnel.topics);
  const [topic, setTopic] = useState(funnel.topics[reel.id] ?? reel.practiceArea);
  const [posterBroken, setPosterBroken] = useState(false);
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
    for (const [label, value] of [
      ["Video", draft.video],
      ["Cover image", draft.poster],
      ["Captions", draft.captions],
    ]) {
      if (value && !isMediaUrl(value.trim())) {
        return setError(`${label} link must start with https:// or /.`);
      }
    }
    const video = draft.video.trim();
    onSave({
      reel: {
        id: reel.id,
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        practiceArea: draft.practiceArea,
        cta: draft.cta,
        video: video
          ? {
              src: video,
              poster: draft.poster.trim() || undefined,
              captions: draft.captions.trim() || undefined,
            }
          : undefined,
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
          <h2 id={`${id}-title`} className="text-xl font-black uppercase tracking-tight text-deep-navy">
            {isNew ? "Add reel" : "Edit reel"}
          </h2>
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
              <span className="mb-1 block text-sm font-semibold text-deep-navy">Case type</span>
              <select className="form-input text-sm" value={draft.practiceArea} onChange={(e) => set({ practiceArea: e.target.value })}>
                {CASE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-deep-navy">Summary</span>
            <textarea className="form-input min-h-20 text-sm" maxLength={300} value={draft.summary} onChange={(e) => set({ summary: e.target.value })} />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-deep-navy">Video file</span>
              <input className="form-input text-sm" inputMode="url" placeholder="/reels/car-accident.mp4" value={draft.video} onChange={(e) => set({ video: e.target.value })} />
              <span className="mt-1 block text-xs text-gray-600">Vertical MP4. Without one, the reel shows &ldquo;Video coming soon&rdquo;.</span>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-deep-navy">Captions <span className="font-normal text-gray-500">(WebVTT)</span></span>
              <input className="form-input text-sm" inputMode="url" placeholder="/reels/car-accident.vtt" value={draft.captions} onChange={(e) => set({ captions: e.target.value })} />
            </label>
          </div>
          <div className="flex gap-4">
            <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-md bg-deep-navy">
              {draft.poster && !posterBroken && (
                // eslint-disable-next-line @next/next/no-img-element -- previews any link the admin pastes
                <img src={draft.poster} alt="" className="h-full w-full object-cover" onError={() => setPosterBroken(true)} />
              )}
            </div>
            <label className="block min-w-0 flex-1">
              <span className="mb-1 block text-sm font-semibold text-deep-navy">Cover image</span>
              <input
                className="form-input text-sm"
                inputMode="url"
                placeholder="/reels/car-accident.jpg"
                value={draft.poster}
                onChange={(e) => { set({ poster: e.target.value }); setPosterBroken(false); }}
                aria-describedby={`${id}-poster-help`}
              />
              <span id={`${id}-poster-help`} className={`mt-1 block text-xs ${posterBroken ? "font-semibold text-red-700" : "text-gray-600"}`}>
                {posterBroken ? "This image didn't load. Check the link." : "Shown before the video plays and on its tile."}
              </span>
            </label>
          </div>
          <label className="block md:w-1/2">
            <span className="mb-1 block text-sm font-semibold text-deep-navy">Main button</span>
            <select className="form-input text-sm" value={draft.cta} onChange={(e) => set({ cta: e.target.value as ReelCta })}>
              {(Object.keys(CTA_LABELS) as ReelCta[]).map((c) => (
                <option key={c} value={c}>
                  {c === "funnel" ? `Funnel default (${CTA_LABELS[funnel.primaryCta]})` : CTA_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
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
          <p className="mr-auto text-xs text-gray-500">Preview: changes last until you leave this page.</p>
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
