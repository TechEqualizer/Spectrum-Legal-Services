"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { PreviewMessage } from "@/admin/components/PreviewFrame";
import type { ReelTotals } from "@/admin/sample-data";
import { formatNumber, formatPercent } from "@/admin/viz";
import type { Publication } from "@/lib/publication";

// The desktop studio around the reel editor: the story on the left, the
// funnel running live in a phone in the middle, Design / Results / Settings
// on the right. Phones keep the single-column editor.

const WIDE = "(min-width: 1280px)";

/** Whether the screen is wide enough for the studio's three columns. */
export function useWideScreen() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(WIDE).matches,
    () => false
  );
}

const PHONE = { width: 390, height: 844 };

/**
 * The real funnel, with the editor's unpublished edits, in a phone you can
 * tap through. `go` restarts it: on the opening screen, or in a reel.
 */
export function StudioPhone({
  slug,
  publication,
  go,
}: {
  slug: string;
  publication: Publication;
  go: { reelId?: string; key: number };
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(0.8);

  // The phone fits the column, never larger than life.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, (el.clientHeight - 24) / (PHONE.height + 24), (el.clientWidth - 24) / (PHONE.width + 24)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && e.data?.type === "preview:ready") setReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const post = (message: PreviewMessage) => frame.current?.contentWindow?.postMessage(message, window.location.origin);
  // Every edit shows at once.
  useEffect(() => {
    if (ready) post({ type: "preview:state", publication });
  }, [ready, publication]);
  // Jump to a moment: the opening screen, or a reel.
  useEffect(() => {
    if (ready && go.key > 0) post({ type: "preview:go", reelId: go.reelId });
  }, [ready, go]);

  return (
    <div ref={box} className="flex h-full min-h-0 items-center justify-center">
      <div
        className="relative flex-shrink-0 rounded-[3.25rem] bg-[#0b0b0d] p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/40"
        style={{ width: PHONE.width + 24, height: PHONE.height + 24, transform: `scale(${scale})`, transformOrigin: "center" }}
      >
        <iframe
          ref={frame}
          src={`/admin/preview/${slug}`}
          title="Live preview of your link"
          className="h-full w-full rounded-[2.5rem] bg-black"
          style={{ width: PHONE.width, height: PHONE.height }}
        />
        {!ready && <div className="absolute inset-3 animate-pulse rounded-[2.5rem] bg-white/5 motion-reduce:animate-none" aria-hidden="true" />}
      </div>
    </div>
  );
}

/** Tabs for the right column, as a segmented control (Apple) with tab semantics (WAI-ARIA). */
export function StudioTabs<T extends string>({
  tabs,
  value,
  onChange,
  children,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" aria-label="Studio" className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-gray-200/70 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${id}-${t.id}`}
            aria-selected={value === t.id}
            aria-controls={`${id}-panel`}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              const i = tabs.findIndex((x) => x.id === value);
              if (e.key === "ArrowRight") onChange(tabs[(i + 1) % tabs.length].id);
              if (e.key === "ArrowLeft") onChange(tabs[(i - 1 + tabs.length) % tabs.length].id);
            }}
            tabIndex={value === t.id ? 0 : -1}
            className={`min-h-10 rounded-lg text-sm font-semibold transition ${value === t.id ? "bg-white text-deep-navy shadow-sm" : "text-gray-600 hover:text-deep-navy"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${value}`} className="mt-4 min-h-0 flex-1">
        {children}
      </div>
    </div>
  );
}

/** Results beside the editor: how far people watch each reel, and what they do. */
export function ResultsPanel({ rows, onPlay }: { rows: ReelTotals[]; onPlay: (reelId: string) => void }) {
  const views = rows.reduce((n, r) => n + r.views, 0);
  const booked = rows.reduce((n, r) => n + r.booked, 0);
  const completed = rows.reduce((n, r) => n + r.completed, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Views", value: formatNumber(views) },
          { label: "Watched to end", value: views ? formatPercent(completed / views) : "–" },
          { label: "Took action", value: formatNumber(booked) },
        ].map((t) => (
          <div key={t.label} className="rounded-xl bg-white px-3 py-3">
            <p className="text-lg font-bold tabular-nums text-deep-navy">{t.value}</p>
            <p className="text-xs text-gray-600">{t.label}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">By reel · last 30 days</p>
        <ul role="list" className="divide-y divide-gray-100 rounded-xl bg-white">
          {rows.map((r) => {
            const watched = r.views ? r.completed / r.views : 0;
            return (
              <li key={r.reel.id}>
                <button
                  type="button"
                  onClick={() => onPlay(r.reel.id)}
                  className="block w-full px-4 py-3 text-left hover:bg-soft-gray/60"
                  aria-label={`${r.reel.title}: ${formatPercent(watched)} watched to the end, ${r.booked} took action. Play in the preview.`}
                >
                  <span className="block truncate text-sm font-semibold text-deep-navy">{r.reel.title}</span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                      <span className="block h-full rounded-full bg-teal-accent" style={{ width: `${Math.round(watched * 100)}%` }} />
                    </span>
                    <span className="w-24 text-right text-xs tabular-nums text-gray-600">
                      {formatPercent(watched)} · {formatNumber(r.booked)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-1.5 px-1 text-xs text-gray-500">Sample numbers. Tap a reel to play it in the preview.</p>
      </div>
      <a href="/admin/overview" className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-deep-navy hover:underline">
        All results →
      </a>
    </div>
  );
}

/** One step of the story in the left column, in the order visitors meet it. "Show" plays that moment in the phone. */
export function StoryStep({
  n,
  title,
  hint,
  onShow,
  children,
}: {
  n: number;
  title: string;
  hint: string;
  onShow: () => void;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex items-center gap-3 px-1">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-deep-navy text-xs font-bold text-white" aria-hidden="true">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={id} className="font-bold leading-tight text-deep-navy">{title}</h2>
          <p className="text-xs text-gray-600">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onShow}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-deep-navy hover:bg-white"
          aria-label={`Show ${title.toLowerCase()} in the preview`}
        >
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l14 8-14 8V4z" /></svg>
          Show
        </button>
      </div>
      {children}
    </section>
  );
}

const icon = (d: string) => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
);

type Tab = "design" | "results" | "settings";

/**
 * The studio: a top bar (Undo, Redo, live link, Publish), then the story,
 * the phone and the tabs side by side, each column scrolling on its own.
 */
export function Studio({
  slug,
  title,
  publication,
  go,
  onRestart,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  unpublished,
  publishing,
  publishError,
  onPublish,
  onDiscard,
  liveHref,
  story,
  design,
  results,
  settings,
  children,
}: {
  slug: string;
  title: string;
  publication: Publication;
  go: { reelId?: string; key: number };
  onRestart: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  unpublished: boolean;
  publishing: string;
  publishError: string;
  onPublish: () => void;
  onDiscard: () => void;
  liveHref: string;
  story: React.ReactNode;
  design: React.ReactNode;
  results: React.ReactNode;
  settings: React.ReactNode;
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("design");

  // ⌘Z / ⇧⌘Z, except while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z" || t.closest("input, textarea, select, [contenteditable], dialog")) return;
      e.preventDefault();
      if (e.shiftKey) onRedo();
      else onUndo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onUndo, onRedo]);

  const quiet = "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-deep-navy hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="flex h-[calc(100dvh-5.5rem)] flex-col">
      <header className="flex items-center gap-2 border-b border-gray-200 pb-3">
        <div className="mr-auto min-w-0">
          <h1 className="truncate text-lg font-bold text-deep-navy">{title}</h1>
          <p className="text-xs text-gray-600">
            {publishError ? (
              <span role="alert" className="font-semibold text-red-700">{publishError}</span>
            ) : publishing ? (
              publishing
            ) : unpublished ? (
              <span className="font-semibold text-amber-800">Unpublished edits · saved in this browser</span>
            ) : (
              "Everything is live"
            )}
          </p>
        </div>
        <button type="button" onClick={onUndo} disabled={!canUndo} className={quiet} aria-keyshortcuts="Meta+Z">
          {icon("M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11")}
          Undo
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo} className={quiet} aria-keyshortcuts="Meta+Shift+Z">
          {icon("M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 000 11H13")}
          Redo
        </button>
        <span className="mx-1 h-6 w-px bg-gray-200" aria-hidden="true" />
        <a href={liveHref} target="_blank" rel="noopener" className={quiet}>
          {icon("M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5")}
          Live link
        </a>
        {canDiscard(unpublished, publishing) && (
          <button type="button" onClick={onDiscard} className={quiet}>
            Discard
          </button>
        )}
        <button
          type="button"
          onClick={onPublish}
          disabled={Boolean(publishing) || !unpublished}
          className="min-h-10 rounded-lg bg-deep-navy px-5 text-sm font-bold text-white shadow-sm hover:bg-royal-blue disabled:opacity-50"
        >
          {publishing ? "Publishing…" : "Publish"}
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(18rem,25rem)_minmax(18rem,1fr)_minmax(17rem,23rem)] gap-5 pt-4">
        <div className="min-h-0 space-y-8 overflow-y-auto pb-10 pr-1" aria-label="Your story">
          {story}
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-accent" aria-hidden="true" />
            Live preview{unpublished ? ", with your unpublished edits" : ""}
            <button type="button" onClick={onRestart} className="ml-1 min-h-8 rounded-md px-2 font-semibold text-deep-navy hover:bg-white">
              Restart
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <StudioPhone slug={slug} publication={publication} go={go} />
          </div>
        </div>
        <div className="flex min-h-0 flex-col overflow-y-auto pb-10 pl-1">
          <StudioTabs
            tabs={[
              { id: "design", label: "Design" },
              { id: "results", label: "Results" },
              { id: "settings", label: "Settings" },
            ]}
            value={tab}
            onChange={setTab}
          >
            {tab === "design" ? design : tab === "results" ? results : <div className="rounded-xl bg-white p-4">{settings}</div>}
          </StudioTabs>
        </div>
      </div>
      {children}
    </div>
  );
}

const canDiscard = (unpublished: boolean, publishing: string) => unpublished && !publishing;
