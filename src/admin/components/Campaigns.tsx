"use client";

import { useState } from "react";
import { sampleCampaigns, type DripCampaign, type DripStep } from "@/admin/sample-data";
import { formatPercent } from "@/admin/viz";
import { JlfLogo } from "@/components/Brand";
import { getReel, reels } from "@/data/reels";
import { site } from "@/config/site";

const triggers = [
  "New lead with case type Car Accident",
  "New lead with case type Motorcycle Accident",
  "New lead with case type Truck Accident",
  "New lead with case type Uber / Lyft Accident",
  "Visitor finished a video, left an email, but didn't book within 2 days",
];

let nextId = 100;

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<DripCampaign[]>(sampleCampaigns);
  const [openId, setOpenId] = useState(sampleCampaigns[0].id);
  const [previewStepId, setPreviewStepId] = useState(sampleCampaigns[0].steps[0].id);

  const campaign = campaigns.find((c) => c.id === openId)!;
  const previewStep = campaign.steps.find((s) => s.id === previewStepId) ?? campaign.steps[0];

  const update = (patch: Partial<DripCampaign>) =>
    setCampaigns((list) => list.map((c) => (c.id === openId ? { ...c, ...patch } : c)));
  const updateStep = (id: string, patch: Partial<DripStep>) =>
    update({ steps: campaign.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const addStep = () => {
    const last = campaign.steps[campaign.steps.length - 1];
    const step: DripStep = {
      id: `new-${nextId++}`,
      delayDays: (last?.delayDays ?? 0) + 3,
      reelId: reels[0].id,
      subject: "A short video from Attorney Jeff",
    };
    update({ steps: [...campaign.steps, step] });
    setPreviewStepId(step.id);
  };
  const removeStep = (id: string) => update({ steps: campaign.steps.filter((s) => s.id !== id) });
  const move = (index: number, by: -1 | 1) => {
    const steps = [...campaign.steps];
    [steps[index], steps[index + by]] = [steps[index + by], steps[index]];
    update({ steps });
  };

  const newCampaign = () => {
    const c: DripCampaign = {
      id: `campaign-${nextId++}`,
      name: "Untitled campaign",
      trigger: triggers[0],
      active: false,
      steps: [{ id: `new-${nextId++}`, delayDays: 0, reelId: reels[0].id, subject: "A short video from Attorney Jeff" }],
      stats: { enrolled: 0, opened: 0, watched: 0, booked: 0 },
    };
    setCampaigns((list) => [...list, c]);
    setOpenId(c.id);
    setPreviewStepId(c.steps[0].id);
  };

  const previewReel = previewStep ? getReel(previewStep.reelId) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-deep-navy">Drip campaigns</h1>
          <p className="text-sm text-gray-600">
            Follow-up emails that each feature one reel, sent on a schedule after a trigger.
          </p>
        </div>
        <button type="button" onClick={newCampaign} className="min-h-11 rounded-md bg-teal-accent px-4 text-sm font-bold text-white hover:brightness-110">
          + New campaign
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Campaign list */}
        <ul className="space-y-3" role="list" aria-label="Campaigns">
          {campaigns.map((c) => {
            const active = c.id === openId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => { setOpenId(c.id); setPreviewStepId(c.steps[0]?.id); }}
                  aria-current={active ? "true" : undefined}
                  className={`w-full rounded-xl border bg-white p-4 text-left transition-shadow hover:shadow-md ${active ? "border-deep-navy ring-2 ring-deep-navy" : "border-gray-200"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-deep-navy">{c.name}</span>
                    <StatusPill active={c.active} />
                  </span>
                  <span className="mt-1 block text-xs text-gray-600">{c.trigger}</span>
                  <span className="mt-3 block text-xs text-gray-700" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {c.steps.length} {c.steps.length === 1 ? "email" : "emails"} &middot; {c.stats.enrolled} enrolled &middot; {c.stats.booked} booked
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Editor */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="campaign-settings">
            <h2 id="campaign-settings" className="sr-only">Campaign settings</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-deep-navy">Campaign name</span>
                <input className="form-input text-sm" value={campaign.name} onChange={(e) => update({ name: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-deep-navy">Starts when</span>
                <select className="form-input text-sm" value={campaign.trigger} onChange={(e) => update({ trigger: e.target.value })}>
                  {[...new Set([campaign.trigger, ...triggers])].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-deep-navy">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-teal-accent"
                  checked={campaign.active}
                  onChange={(e) => update({ active: e.target.checked })}
                />
                Campaign is active
              </label>
              <p className="text-xs text-gray-500">Stops automatically when the lead books a consultation.</p>
            </div>

            {campaign.stats.enrolled > 0 && (
              <dl className="mt-5 grid grid-cols-2 gap-2 border-t border-gray-100 pt-5 sm:grid-cols-4" style={{ fontVariantNumeric: "tabular-nums" }}>
                {[
                  ["Enrolled", campaign.stats.enrolled, null],
                  ["Opened", campaign.stats.opened, campaign.stats.opened / campaign.stats.enrolled],
                  ["Watched the reel", campaign.stats.watched, campaign.stats.watched / campaign.stats.enrolled],
                  ["Booked", campaign.stats.booked, campaign.stats.booked / campaign.stats.enrolled],
                ].map(([label, n, rate]) => (
                  <div key={label as string} className="rounded-md bg-soft-gray px-3 py-3">
                    <dt className="text-xs text-gray-600">{label}</dt>
                    <dd className="text-xl font-bold text-deep-navy">
                      {n as number}
                      {rate !== null && <span className="ml-1 text-xs font-medium text-gray-600">{formatPercent(rate as number)}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            {/* Timeline of steps */}
            <section className="rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="steps-title">
              <h2 id="steps-title" className="mb-4 text-base font-bold text-deep-navy">Email sequence</h2>
              <ol className="relative space-y-4 border-l-2 border-gray-200 pl-6">
                <li className="relative">
                  <span className="absolute -left-[33px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-deep-navy ring-4 ring-white" aria-hidden="true" />
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Trigger</p>
                  <p className="text-sm text-deep-navy">{campaign.trigger}</p>
                </li>
                {campaign.steps.map((step, i) => {
                  const reel = getReel(step.reelId);
                  const previewing = previewStep?.id === step.id;
                  return (
                    <li key={step.id} className="relative">
                      <span className="absolute -left-[33px] top-4 h-4 w-4 rounded-full bg-teal-accent ring-4 ring-white" aria-hidden="true" />
                      <div className={`rounded-lg border p-4 ${previewing ? "border-teal-accent bg-teal-accent/5" : "border-gray-200"}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-deep-navy">
                            Send on day
                            <input
                              type="number"
                              min={0}
                              max={60}
                              className="form-input w-20 py-1.5 text-sm"
                              value={step.delayDays}
                              onChange={(e) => updateStep(step.id, { delayDays: Math.max(0, Number(e.target.value) || 0) })}
                            />
                          </label>
                          <div className="flex items-center gap-1">
                            <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)} d="M5 15l7-7 7 7" />
                            <IconButton label="Move down" disabled={i === campaign.steps.length - 1} onClick={() => move(i, 1)} d="M19 9l-7 7-7-7" />
                            <IconButton label="Remove email" disabled={campaign.steps.length === 1} onClick={() => removeStep(step.id)} d="M6 18L18 6M6 6l12 12" />
                          </div>
                        </div>
                        <label className="mt-3 block">
                          <span className="mb-1 block text-xs font-semibold text-gray-600">Subject line</span>
                          <input className="form-input py-2 text-sm" value={step.subject} onChange={(e) => updateStep(step.id, { subject: e.target.value })} />
                        </label>
                        <label className="mt-3 block">
                          <span className="mb-1 block text-xs font-semibold text-gray-600">Featured reel</span>
                          <select className="form-input py-2 text-sm" value={step.reelId} onChange={(e) => updateStep(step.id, { reelId: e.target.value })}>
                            {reels.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                          </select>
                        </label>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-gray-600">{reel?.practiceArea}</p>
                          <button
                            type="button"
                            onClick={() => setPreviewStepId(step.id)}
                            className="min-h-9 text-xs font-semibold text-teal-accent hover:underline"
                            aria-pressed={previewing}
                          >
                            {previewing ? "Previewing" : "Preview email"}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
                <button type="button" onClick={addStep} className="min-h-11 rounded-md border border-gray-300 px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray">
                  + Add email
                </button>
                <button type="button" disabled className="min-h-11 rounded-md bg-teal-accent px-4 text-sm font-bold text-white opacity-50" title="Saving comes with the admin login and email setup">
                  Save campaign
                </button>
                <p className="text-xs text-gray-500">Preview only: nothing is saved or sent.</p>
              </div>
            </section>

            {/* Email preview */}
            <section className="xl:self-start" aria-labelledby="preview-title">
              <h2 id="preview-title" className="mb-2 text-sm font-bold text-deep-navy">
                Email preview {previewStep && <span className="font-normal text-gray-600">&middot; day {previewStep.delayDays}</span>}
              </h2>
              {previewStep && previewReel && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 px-4 py-3 text-xs text-gray-600">
                    <p><span className="font-semibold text-gray-800">From:</span> Attorney Jeff, {site.name}</p>
                    <p className="truncate"><span className="font-semibold text-gray-800">Subject:</span> {previewStep.subject}</p>
                  </div>
                  <div className="bg-deep-navy px-4 py-3">
                    <JlfLogo className="h-9 w-auto" />
                  </div>
                  <div className="space-y-3 p-4 text-sm text-charcoal">
                    <p>Hi there,</p>
                    <p>Here&apos;s a short video that answers a question we hear a lot.</p>
                    <div className="relative flex aspect-video items-end overflow-hidden rounded-lg bg-gradient-to-br from-royal-blue to-deep-navy p-3">
                      <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/25" aria-hidden="true">
                        <svg className="ml-0.5 h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4l14 8-14 8V4z" /></svg>
                      </span>
                      <p className="relative text-sm font-semibold leading-snug text-white">{previewReel.title}</p>
                    </div>
                    <p className="text-xs text-gray-600">{previewReel.summary}</p>
                    <span className="block rounded-md bg-teal-accent px-4 py-2.5 text-center text-sm font-bold text-white">
                      Book your free case evaluation
                    </span>
                    <p className="text-[11px] leading-snug text-gray-500">
                      Attorney Advertising. General information, not legal advice. You&apos;re getting this because you asked {site.name} about your case. Unsubscribe anytime.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? "bg-green-50 text-green-800" : "bg-gray-100 text-gray-700"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-green-600" : "bg-gray-400"}`} aria-hidden="true" />
      {active ? "Active" : "Draft"}
    </span>
  );
}

function IconButton({ label, d, onClick, disabled }: { label: string; d: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-soft-gray hover:text-deep-navy disabled:opacity-30"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
        <path d={d} />
      </svg>
    </button>
  );
}
