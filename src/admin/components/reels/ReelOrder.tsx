"use client";

import { useState } from "react";
import ReelRow from "@/admin/components/reels/ReelRow";
import type { EditorFunnel, EditorReel, PathTarget } from "@/admin/editor-model";
import type { LiveState } from "@/admin/publish";
import type { ReelTotals } from "@/admin/stats";

/**
 * The funnel's reels in order: drag or arrows to move, a row per reel, a
 * reel from the library to add, and what's live.
 */
export default function ReelOrder({
  funnel,
  library,
  reach,
  stats,
  prompts,
  announcement,
  live,
  email,
  savedAt,
  unpublished,
  pathLabel,
  shortDateOf,
  moveTo,
  onAdd,
  onEdit,
  onPlay,
  onRemove,
}: {
  funnel: EditorFunnel;
  library: EditorReel[];
  /** Reels a visitor can get to. */
  reach: Set<string>;
  stats: Map<string, ReelTotals>;
  prompts: Record<string, string>;
  /** Read out after a move, for keyboard and screen reader users. */
  announcement: string;
  live: LiveState | null;
  email: string;
  savedAt: number | null;
  unpublished: boolean;
  pathLabel: (target: PathTarget) => string;
  shortDateOf: (eventId?: string) => string | undefined;
  moveTo: (reelId: string, index: number) => void;
  onAdd: (reelId: string) => void;
  onEdit: (reel: EditorReel) => void;
  onPlay: (reelId: string) => void;
  onRemove: (reelId: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [addId, setAddId] = useState("");
  const byId = new Map(library.map((r) => [r.id, r]));
  const notInFunnel = library.filter((r) => !funnel.order.includes(r.id));

  return (
    <section className="rounded-xl border border-gray-200 bg-white" aria-labelledby="order-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 px-5 py-4">
        <h2 id="order-title" className="text-base font-bold text-deep-navy">Order</h2>
        <p className="text-xs text-gray-600">Drag or use the arrows. Results: last 30 days.</p>
      </div>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      {funnel.order.length === 0 ? (
        <p className="p-6 text-sm text-gray-600">No reels yet. Add one below or create a new reel.</p>
      ) : (
        // Rows lay out by the list's own width: in the studio it's a column, not the window.
        <ol role="list" className="@container">
          {funnel.order.map((id, i) => {
            const reel = byId.get(id);
            if (!reel) return null;
            return (
              <ReelRow
                date={shortDateOf(reel.eventId)}
                hasPrompt={Boolean(prompts[id])}
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
                onEdit={() => onEdit(reel)}
                onPlay={() => onPlay(id)}
                onRemove={() => onRemove(id)}
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
                onAdd(addId);
                setAddId("");
              }}
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm font-semibold text-deep-navy hover:bg-soft-gray disabled:opacity-40"
            >
              Add
            </button>
          </div>
        )}
        <p className="ml-auto text-right text-xs text-gray-600">
          {live?.publishedAt ? (
            <>
              <span className="font-semibold text-deep-navy">Live</span> &middot; published{" "}
              {new Date(live.publishedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              {live.publishedBy && live.publishedBy !== email.toLowerCase() ? ` by ${live.publishedBy}` : ""}
            </>
          ) : (
            <><span className="font-semibold text-deep-navy">Live</span> &middot; original reels</>
          )}
          {savedAt && unpublished && <> &middot; edits saved in this browser</>}
        </p>
      </div>
    </section>
  );
}
