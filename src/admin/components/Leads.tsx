"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdminBusiness, useAdminEvents } from "@/admin/AdminBusiness";
import LocalDate from "@/components/LocalDate";
import type { Funnel } from "@/data/funnel-types";
import { funnelReel } from "@/data/reels";
import { sourceLabel } from "@/lib/source-tag";

/** One lead, as /api/admin/leads returns it (the database's funnel_leads). */
export type AdminLead = {
  id: string;
  created_at: string;
  name: string;
  phone: string | null;
  email: string | null;
  /** book: wants a call back. text_later: wants updates by text. */
  intent: "book" | "text_later";
  case_type: string;
  message: string | null;
  referring_reel_id: string | null;
  source_tag: string | null;
  /** Reels this person watched to the end before asking, in the order they finished them. */
  watched: string[];
};

type State = { slug: string; leads: AdminLead[] | null; error: string };

const asked = (lead: AdminLead) => (lead.intent === "text_later" ? "Updates by text" : "Call back");

/**
 * The event's leads: everyone who asked for a call back or for updates from
 * its link, newest first, with the reels they watched first. A list, and the
 * selected lead's details beside it (below it, on phones).
 */
export default function Leads() {
  const business = useAdminBusiness();
  const slug = business.funnel.slug;
  // Reels as visitors see them, so a reel added since it was built still has its title.
  const funnel = useAdminEvents().find((e) => e.funnel.slug === slug)?.live ?? business.funnel;
  const [state, setState] = useState<State>({ slug: "", leads: null, error: "" });
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    fetch(`/api/admin/leads?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!current) return;
        if (!res.ok || !Array.isArray(body)) {
          setState({ slug, leads: null, error: body?.error ?? "Couldn't load leads. Reload to try again." });
        } else {
          setState({ slug, leads: body as AdminLead[], error: "" });
        }
      })
      .catch(() => current && setState({ slug, leads: null, error: "Couldn't reach the server. Check your connection and reload." }));
    return () => {
      current = false;
    };
  }, [slug]);

  const { leads, error } = state.slug === slug ? state : { leads: null, error: "" };
  // Wide screens always show one lead's details: the one picked, or the newest.
  const shown = leads?.find((l) => l.id === openId) ?? leads?.[0];
  const tickets = funnel.primaryCta === "tickets";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-deep-navy">Leads</h1>
        <p className="text-sm text-gray-600">{business.terms.leadsIntro}</p>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-900">
          {error}
        </p>
      ) : !leads ? (
        <p role="status" className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-sm text-gray-600">
          Loading leads…
        </p>
      ) : leads.length === 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center" aria-labelledby="no-leads-title">
          <h2 id="no-leads-title" className="text-lg font-bold text-deep-navy">No leads yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">
            {tickets
              ? "When someone signs up for updates from your link, they show up here."
              : "When someone asks for a call back or for updates from your link, they show up here."}
          </p>
          <Link href="/admin/links" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue">
            Share your link
          </Link>
        </section>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="min-w-0" aria-labelledby="lead-list-title">
            <h2 id="lead-list-title" className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-600">
              {leads.length === 1 ? "1 lead" : `${leads.length} leads`}, newest first
            </h2>
            <ul role="list" className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {leads.map((l) => {
                const open = openId === l.id;
                const reel = l.referring_reel_id ? funnelReel(funnel, l.referring_reel_id) : undefined;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : l.id)}
                      aria-expanded={open}
                      className={`flex min-h-16 w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-soft-gray focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-accent ${
                        shown?.id === l.id ? "xl:bg-soft-gray" : ""
                      } ${open ? "bg-soft-gray" : ""}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="truncate font-bold text-deep-navy">{l.name}</span>
                          <span className="text-xs font-semibold text-gray-600">{asked(l)}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-sm text-gray-600">
                          {[l.case_type, reel ? `from "${reel.title}"` : null, sourceLabel(l.source_tag ?? undefined)].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="flex-shrink-0 pt-0.5 text-xs text-gray-600">
                        <LocalDate iso={l.created_at} />
                      </span>
                    </button>
                    {/* Phones and tablets: the details open under the lead. */}
                    {open && (
                      <div className="border-t border-gray-100 bg-white px-4 py-4 xl:hidden">
                        <LeadDetails lead={l} funnel={funnel} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {shown && (
            <aside className="hidden rounded-xl border border-gray-200 bg-white p-5 xl:block xl:self-start" aria-label="Lead details" aria-live="polite">
              <LeadDetails lead={shown} funnel={funnel} />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

/** One lead: how to reach them, what they asked for, and the reels they watched first. */
function LeadDetails({ lead, funnel }: { lead: AdminLead; funnel: Funnel }) {
  const reel = lead.referring_reel_id ? funnelReel(funnel, lead.referring_reel_id) : undefined;
  const textLater = lead.intent === "text_later";
  const rows = [
    { label: "Asked for", value: textLater ? "Updates by text" : "A call back" },
    { label: "Interested in", value: lead.case_type },
    { label: "From reel", value: reel?.title ?? "The link" },
    { label: "Link shared on", value: sourceLabel(lead.source_tag ?? undefined) },
  ];
  return (
    <div className="space-y-5">
      <div>
        <p className="text-lg font-bold text-deep-navy">{lead.name}</p>
        <p className="text-sm text-gray-600">
          <LocalDate iso={lead.created_at} />
        </p>
      </div>

      {(lead.phone || lead.email) && (
        <div className="flex flex-wrap gap-2">
          {lead.phone && (
            <a
              href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex min-h-11 items-center rounded-lg bg-deep-navy px-4 text-sm font-bold text-white hover:bg-royal-blue"
            >
              Call {lead.phone}
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex min-h-11 max-w-full items-center truncate rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray"
            >
              {lead.email}
            </a>
          )}
        </div>
      )}

      <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200">
        {rows.map((r) => (
          <div key={r.label} className="flex min-h-11 items-center justify-between gap-4 px-4 py-2 text-sm">
            <dt className="flex-shrink-0 whitespace-nowrap text-gray-600">{r.label}</dt>
            <dd className="min-w-0 text-right font-semibold text-deep-navy">{r.value}</dd>
          </div>
        ))}
      </dl>

      {lead.message && (
        <div>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-600">Message</h3>
          <p className="whitespace-pre-line rounded-lg bg-soft-gray px-4 py-3 text-sm text-charcoal">{lead.message}</p>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-600">Reels watched first</h3>
        {lead.watched.length ? (
          <ol className="relative space-y-3 border-l-2 border-gray-200 pl-5" aria-label="Reels watched to the end, in order">
            {lead.watched.map((id, i) => (
              <li key={`${id}-${i}`} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-teal-accent ring-4 ring-white" aria-hidden="true" />
                <p className="text-sm font-medium text-deep-navy">{funnelReel(funnel, id)?.title ?? "A reel since removed"}</p>
                <p className="text-xs text-gray-600">Watched to the end</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-600">None watched to the end before asking.</p>
        )}
      </div>
    </div>
  );
}
