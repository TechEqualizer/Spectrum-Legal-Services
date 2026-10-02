"use client";

import { useState } from "react";
import { sampleCampaigns, sampleLeads, type LeadStatus } from "@/admin/sample-data";
import { FIRM_TIME_ZONE } from "@/admin/viz";
import { getReel } from "@/data/reels";
import { sourceLabel } from "@/lib/source-tag";

const statusStyle: Record<LeadStatus, string> = {
  New: "bg-sky-accent/20 text-deep-navy",
  Contacted: "bg-gray-100 text-gray-800",
  "Consultation booked": "bg-amber-50 text-amber-900",
  Signed: "bg-green-50 text-green-800",
};

const formatWhen = (d: Date) =>
  d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: FIRM_TIME_ZONE });

export default function Leads() {
  const [openId, setOpenId] = useState<string | null>(sampleLeads[0].id);
  const [filter, setFilter] = useState<"All" | LeadStatus>("All");
  const visible = sampleLeads.filter((l) => filter === "All" || l.status === filter);
  const lead = sampleLeads.find((l) => l.id === openId);
  const campaign = lead?.campaignId ? sampleCampaigns.find((c) => c.id === lead.campaignId) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-deep-navy">Leads</h1>
          <p className="text-sm text-gray-600">Case evaluation requests, with the videos each person watched first.</p>
        </div>
        <div className="flex flex-wrap rounded-md border border-gray-300 bg-white p-1" role="group" aria-label="Filter by status">
          {(["All", "New", "Contacted", "Consultation booked", "Signed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              aria-pressed={filter === s}
              className={`min-h-9 rounded px-3 text-sm font-semibold ${filter === s ? "bg-deep-navy text-white" : "text-gray-700 hover:bg-soft-gray"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white" aria-label="Lead list">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Lead</th>
                <th className="px-4 py-3 font-semibold">Received</th>
                <th className="px-4 py-3 font-semibold">Case type</th>
                <th className="px-4 py-3 font-semibold">Came from</th>
                <th className="px-4 py-3 text-right font-semibold">Videos</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((l) => (
                <tr
                  key={l.id}
                  className={`cursor-pointer border-b border-gray-100 hover:bg-soft-gray ${openId === l.id ? "bg-soft-gray" : ""}`}
                  onClick={() => setOpenId(l.id)}
                >
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setOpenId(l.id)} className="whitespace-nowrap font-semibold text-deep-navy hover:underline" aria-pressed={openId === l.id}>
                      {l.id}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatWhen(l.receivedAt)}</td>
                  <td className="px-4 py-3 text-gray-700">{l.caseType}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                    {l.source}
                    <span className="block text-xs text-gray-500">{sourceLabel(l.sourceTag)}</span>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{l.watchedReelIds.length}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[l.status]}`}>{l.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <p className="p-6 text-sm text-gray-600">No leads with this status.</p>}
        </section>

        <aside className="rounded-xl border border-gray-200 bg-white p-5 xl:self-start" aria-live="polite">
          {lead ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Lead {lead.id}</p>
                <p className="mt-1 text-lg font-bold text-deep-navy">{lead.caseType}</p>
                <p className="text-sm text-gray-600">Received {formatWhen(lead.receivedAt)} via {lead.source.toLowerCase()}</p>
                <p className="mt-2 rounded-md bg-soft-gray px-3 py-2 text-xs text-gray-600">
                  Name, email, phone and message appear here once real leads are connected.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-bold text-deep-navy">Video journey before booking</h2>
                <ol className="relative space-y-3 border-l-2 border-gray-200 pl-5">
                  <li className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-gray-400 ring-4 ring-white" aria-hidden="true" />
                    <p className="text-sm font-medium text-deep-navy">
                      {lead.sourceTag ? `Opened the link from ${sourceLabel(lead.sourceTag)}` : "Opened the link directly"}
                    </p>
                  </li>
                  {lead.watchedReelIds.map((id, i) => {
                    const reel = getReel(id);
                    return (
                      <li key={`${id}-${i}`} className="relative">
                        <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-teal-accent ring-4 ring-white" aria-hidden="true" />
                        <p className="text-sm font-medium text-deep-navy">{reel?.title}</p>
                        <p className="text-xs text-gray-600">Watched to the end</p>
                      </li>
                    );
                  })}
                  <li className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-deep-navy ring-4 ring-white" aria-hidden="true" />
                    <p className="text-sm font-medium text-deep-navy">
                      {lead.source === "Text me later" ? "Asked to be texted the next video" : "Requested a case evaluation"}
                    </p>
                    <p className="text-xs text-gray-600">
                      {lead.referringReelId ? `From "${getReel(lead.referringReelId)?.title}"` : "From the hero form"}
                    </p>
                  </li>
                </ol>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h2 className="mb-1 text-sm font-bold text-deep-navy">Drip campaign</h2>
                {campaign ? (
                  <p className="text-sm text-gray-700">
                    Enrolled in <strong>{campaign.name}</strong> ({campaign.steps.length} emails). Stops when they book.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">Not in a campaign. Campaigns start from their trigger, e.g. a new car accident lead.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Select a lead to see its video journey.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
