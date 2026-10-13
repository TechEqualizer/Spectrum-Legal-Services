/**
 * Shows up on phones when there are edits the live link doesn't have yet:
 * Undo (the last change), Discard (Undo puts the edits back) and Publish,
 * which asks first (the Publish sheet).
 */
export default function PublishBar({
  publishing,
  publishError,
  unpublished,
  canUndo,
  onUndo,
  onDiscard,
  onPublish,
}: {
  publishing: string;
  publishError: string;
  unpublished: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onDiscard: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 lg:bottom-4" role="region" aria-label="Publish">
      <div className="flex items-center gap-2 rounded-2xl bg-deep-navy py-2.5 pl-4 pr-2.5 sm:gap-4 text-white shadow-2xl ring-1 ring-white/10 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{publishing || "Unpublished edits"}</p>
          {publishError ? (
            <p role="alert" className="text-xs text-red-200">{publishError}</p>
          ) : (
            !publishing && <p className="hidden text-xs text-gray-300 sm:block">Saved on this device. Publish to update your link.</p>
          )}
        </div>
        {!publishing && canUndo && (
          <button type="button" onClick={onUndo} aria-label="Undo the last change" className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-200 hover:bg-white/10">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11" />
            </svg>
          </button>
        )}
        {!publishing && unpublished && (
          <button type="button" onClick={onDiscard} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-gray-200 hover:bg-white/10">
            Discard
          </button>
        )}
        <button
          type="button"
          data-tour="publish"
          onClick={onPublish}
          disabled={Boolean(publishing) || !unpublished}
          className="min-h-11 rounded-lg bg-white px-5 text-sm font-bold text-deep-navy shadow-md hover:bg-soft-gray disabled:opacity-60"
        >
          {publishing ? "Publishing..." : "Publish"}
        </button>
      </div>
    </div>
  );
}
