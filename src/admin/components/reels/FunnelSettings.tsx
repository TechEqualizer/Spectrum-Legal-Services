import { useId } from "react";
import { ENTRY_TRIGGERS, type EditorFunnel } from "@/admin/editor-model";
import type { LiveState } from "@/admin/publish";

/** The selected funnel's name, who sees it, its main button and whether it's the default; take down published edits. */
export default function FunnelSettings({
  funnel,
  live,
  updateFunnel,
  onTakeDown,
}: {
  funnel: EditorFunnel;
  live: LiveState | null;
  updateFunnel: (patch: Partial<EditorFunnel>) => void;
  onTakeDown: () => void;
}) {
  const id = useId();
  const field = "form-input mt-1.5 text-base";
  return (
    <div className="p-4 xl:p-0">
      <div className="divide-y divide-gray-100 rounded-xl bg-white">
        <div className="px-4 py-3">
          <label htmlFor={`${id}-name`} className="text-sm font-semibold text-deep-navy">Funnel name</label>
          <input id={`${id}-name`} className={field} value={funnel.name} onChange={(e) => updateFunnel({ name: e.target.value })} />
        </div>
        <div className="px-4 py-3">
          <label htmlFor={`${id}-entry`} className="text-sm font-semibold text-deep-navy">Shown to</label>
          <select id={`${id}-entry`} className={field} value={funnel.entry} onChange={(e) => updateFunnel({ entry: e.target.value as EditorFunnel["entry"] })}>
            {ENTRY_TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="px-4 py-3">
          <label htmlFor={`${id}-cta`} className="text-sm font-semibold text-deep-navy">Main button</label>
          <select id={`${id}-cta`} className={field} value={funnel.primaryCta} onChange={(e) => updateFunnel({ primaryCta: e.target.value as EditorFunnel["primaryCta"] })}>
            <option value="call">Call</option>
            <option value="book">Book</option>
            <option value="tickets">Tickets</option>
          </select>
        </div>
        <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-deep-navy">Default funnel</span>
            <span className="block text-xs text-gray-600">Shown when no other funnel matches. Publish sends it to your live link.</span>
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 flex-shrink-0 accent-teal-accent"
            checked={funnel.isDefault}
            onChange={(e) => updateFunnel({ isDefault: e.target.checked })}
          />
        </label>
      </div>
      {live?.publishedAt && (
        <div className="mt-4 px-1">
          <button type="button" onClick={onTakeDown} className="min-h-11 text-sm font-semibold text-red-700 hover:underline">
            Take down published edits
          </button>
          <p className="text-xs text-gray-600">Your link goes back to its original reels. Your edits stay here.</p>
        </div>
      )}
    </div>
  );
}
