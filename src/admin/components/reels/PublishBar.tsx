/** Shows up on phones when there are edits the live link doesn't have yet. */
export default function PublishBar({
  publishing,
  publishError,
  unpublished,
  onDiscard,
  onPublish,
}: {
  publishing: string;
  publishError: string;
  unpublished: boolean;
  onDiscard: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 lg:bottom-4" role="region" aria-label="Publish">
      <div className="flex items-center gap-2 rounded-2xl bg-deep-navy py-2.5 pl-4 pr-2.5 sm:gap-4 text-white shadow-2xl ring-1 ring-white/10 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{publishing || "Unpublished edits"}</p>
          {publishError ? (
            <p role="alert" className="text-xs text-red-200">{publishError}</p>
          ) : (
            !publishing && <p className="hidden text-xs text-gray-300 sm:block">Saved here. Publish to update your live link.</p>
          )}
        </div>
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
          className="min-h-11 rounded-lg bg-teal-accent px-5 text-sm font-bold text-white shadow-md hover:brightness-110 disabled:opacity-60"
        >
          {publishing ? "Publishing..." : "Publish"}
        </button>
      </div>
    </div>
  );
}
