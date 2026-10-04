import Link from "next/link";
import { ENTRY_TRIGGERS, type EditorFunnel } from "@/admin/editor-model";
import type { LiveState } from "@/admin/publish";

/** The selected funnel's name, audience and main button; links to every path; take down published edits. */
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
  return (
    <div className="border-t border-gray-100 p-5 xl:border-0 xl:p-0">
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_11rem]">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-deep-navy">Funnel name</span>
        <input className="form-input text-sm" value={funnel.name} onChange={(e) => updateFunnel({ name: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-deep-navy">Shown to</span>
        <select className="form-input text-sm" value={funnel.entry} onChange={(e) => updateFunnel({ entry: e.target.value as EditorFunnel["entry"] })}>
          {ENTRY_TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-deep-navy">Main button</span>
        <select className="form-input text-sm" value={funnel.primaryCta} onChange={(e) => updateFunnel({ primaryCta: e.target.value as EditorFunnel["primaryCta"] })}>
          <option value="call">Call</option>
          <option value="book">Book</option>
          <option value="tickets">Tickets</option>
        </select>
      </label>
    </div>
    <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold text-deep-navy">
      <input
        type="checkbox"
        className="h-5 w-5 accent-teal-accent"
        checked={funnel.isDefault}
        onChange={(e) => updateFunnel({ isDefault: e.target.checked })}
      />
      Default funnel: shown when no other funnel matches the visitor
    </label>
    <p className="mt-1 text-xs text-gray-600">Publish sends the default funnel to your live link.</p>
    <p className="mt-3 text-sm text-gray-600">
      <Link href="/admin/funnel" className="inline-flex min-h-10 items-center font-semibold text-deep-navy underline-offset-2 hover:underline">
        See every path
      </Link>
      <span className="block text-xs">Every route a visitor can take through your reels, on one map.</span>
    </p>
    {live?.publishedAt && (
      <div className="mt-4 border-t border-gray-100 pt-4">
        <button type="button" onClick={onTakeDown} className="min-h-10 text-sm font-semibold text-red-700 hover:underline">
          Take down published edits
        </button>
        <p className="text-xs text-gray-600">Your link goes back to its original reels. Your edits stay here.</p>
      </div>
    )}
    </div>
  );
}
