import type { Toast as ToastState } from "@/admin/use-editor";

/** A short confirmation near the bottom of the screen, with Undo when something can be put back. */
export default function Toast({
  toast,
  raised,
  onDismiss,
}: {
  toast: ToastState | null;
  /** Sits higher, above the publish bar. */
  raised: boolean;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className={`fixed inset-x-0 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full bg-deep-navy py-2.5 pl-5 text-sm font-semibold text-white shadow-lg ring-1 ring-white/15 transition-opacity ${toast?.undo ? "pr-2" : "pointer-events-none pr-5"} ${
        // Above the tab bar, and above the publish bar when it shows.
        raised ? "bottom-[calc(9.5rem+env(safe-area-inset-bottom))] lg:bottom-28" : "bottom-24 lg:bottom-8"
      } ${toast ? "opacity-100" : "opacity-0"}`}
    >
      {toast && (
        <>
          <span><span aria-hidden="true">&#10003; </span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo!();
                onDismiss();
              }}
              className="min-h-9 rounded-full px-3 font-bold text-sky-accent hover:bg-white/10"
            >
              Undo
            </button>
          )}
        </>
      )}
    </div>
  );
}
