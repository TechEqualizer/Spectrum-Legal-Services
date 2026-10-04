import { PlusIcon } from "@/admin/components/ui/icons";
import { CTA_LABELS, ENTRY_TRIGGERS, type EditorFunnel } from "@/admin/editor-model";

/** The business's funnels, each with who it's shown to; one is being edited. */
export default function FunnelTabs({
  funnels,
  activeId,
  liveId,
  onSelect,
  onNew,
}: {
  funnels: EditorFunnel[];
  activeId: string;
  /** The funnel the live link shows. */
  liveId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <section aria-labelledby="funnels-title">
      <h2 id="funnels-title" className="sr-only">Funnels</h2>
      <ul className="flex gap-3 overflow-x-auto pb-1" role="list">
        {funnels.map((f) => {
          const active = f.id === activeId;
          return (
            <li key={f.id} className="flex-shrink-0">
              <button
                type="button"
                onClick={() => onSelect(f.id)}
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
                  {f.id === liveId && <span className="ml-1 font-normal text-teal-accent">&middot; live</span>}
                </span>
              </button>
            </li>
          );
        })}
        <li className="flex-shrink-0">
          <button
            type="button"
            onClick={onNew}
            className="flex h-full min-h-24 w-40 items-center justify-center gap-2 rounded-xl border border-dashed border-gray-400 px-4 text-sm font-semibold text-deep-navy hover:bg-white"
          >
            <PlusIcon />
            New funnel
          </button>
        </li>
      </ul>
    </section>
  );
}
