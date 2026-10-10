"use client";

import { useState, useSyncExternalStore } from "react";
import { useAdminBusiness, useAdminEvents } from "@/admin/AdminBusiness";
import { useResults } from "@/admin/results";
import SalesHint from "@/admin/components/SalesHint";
import CopyButton from "@/admin/components/ui/CopyButton";
import { formatNumber, viz } from "@/admin/viz";
import { funnelReel } from "@/data/reels";
import { normalizeSourceTag, SOURCE_PRESETS, sourceLabel } from "@/lib/source-tag";

const ranges = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

const CUSTOM = "__custom";

// The page's own origin, so built links point at wherever the site is hosted.
const useOrigin = () =>
  useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  );

export default function Links() {
  const business = useAdminBusiness();
  const { funnel } = business;
  const origin = useOrigin();
  // An organizer's event: their permanent link (the one for their bio) always shows the next event.
  const organizer = useAdminEvents().find((e) => e.funnel.slug === funnel.slug)?.organizer;
  const [preset, setPreset] = useState<string>(SOURCE_PRESETS[0].tag);
  const [custom, setCustom] = useState("");
  const [start, setStart] = useState("");
  const [range, setRange] = useState(ranges[1]);

  // Typed in their own words ("DJ Mike's story"): the link gets a tag made of
  // it (dj-mikes-story), and Results shows it back as words.
  const customTag = normalizeSourceTag(slugify(custom));
  const samePlace = customTag ? SOURCE_PRESETS.find((p) => p.tag === customTag) : undefined;
  const tag = preset === CUSTOM ? customTag : preset;
  const query = new URLSearchParams();
  if (tag) query.set("src", tag);
  if (start) query.set("start", start);
  const path = `/f/${funnel.slug}${query.size ? `?${query}` : ""}`;
  const url = `${origin}${path}`;


  // An event sells tickets: its "bookings" are ticket clicks, and it takes no calls.
  const tickets = funnel.primaryCta === "tickets";
  const won = (r: { calls: number; bookings: number }) => (tickets ? r.bookings : r.calls + r.bookings);
  const wonLabel = tickets ? "ticket clicks" : "calls and bookings";
  const per100 = (r: { calls: number; bookings: number; visitors: number }) => (r.visitors ? (won(r) / r.visitors) * 100 : 0);
  const { results, error } = useResults(range.days);
  const rows = (results?.sources ?? []).map((r) => ({ ...r, per100: per100(r) })).sort((a, b) => b.per100 - a.per100 || b.visitors - a.visitors);
  // At least 1, so bars are never divided by zero.
  const maxPer100 = Math.max(1, ...rows.map((r) => r.per100));
  const totals = rows.reduce(
    (t, r) => ({
      visitors: t.visitors + r.visitors,
      calls: t.calls + r.calls,
      bookings: t.bookings + r.bookings,
      textLater: t.textLater + r.textLater,
      sold: t.sold + r.sold,
    }),
    { visitors: 0, calls: 0, bookings: 0, textLater: 0, sold: 0 }
  );
  // Tickets sold on Eventbrite, once the organizer has connected it.
  const sales = tickets ? results?.sales ?? null : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-deep-navy">Share</h1>
        <p className="text-sm text-gray-600">
          {organizer ? "Your bio link, and a tagged link for each other place you share" : "Your link. Give each place you share it its own tag"}, so you can see which one brings {wonLabel}.
        </p>
      </div>

      {organizer && (
        <section className="rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="bio-title" data-tour="share-bio">
          <h2 id="bio-title" className="text-base font-bold text-deep-navy">Your bio link</h2>
          <p className="mt-1 text-sm text-gray-600">
            Always shows your next event, so it never needs changing. Put this one in your Instagram and TikTok bio.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 basis-full truncate rounded-lg bg-soft-gray sm:basis-auto px-3 py-2.5 text-sm font-semibold text-deep-navy">
              {`${origin}/f/${organizer.slug}`.replace(/^https?:\/\//, "")}
            </code>
            <CopyButton
              text={`${origin}/f/${organizer.slug}`}
              announce="Bio link copied"
              className="min-h-11 rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue"
            />
          </div>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="builder-title" data-tour="share-builder">
        <h2 id="builder-title" className="mb-4 text-base font-bold text-deep-navy">{organizer ? "A link for this event" : "Build a link"}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="link-source" className="mb-1 block text-sm font-semibold text-deep-navy">
              Where will you share it?
            </label>
            <select id="link-source" className="form-input text-sm" value={preset} onChange={(e) => { setPreset(e.target.value); }}>
              {SOURCE_PRESETS.map((p) => (
                <option key={p.tag} value={p.tag}>{p.label}</option>
              ))}
              <option value={CUSTOM}>Somewhere else...</option>
            </select>
            {preset === CUSTOM && (
              <div className="mt-2">
                <label htmlFor="link-custom" className="sr-only">Name of the place</label>
                <input
                  id="link-custom"
                  className="form-input text-sm"
                  placeholder="e.g. Bus bench, DJ Mike's story"
                  maxLength={60}
                  value={custom}
                  onChange={(e) => { setCustom(e.target.value); }}
                  aria-describedby="link-custom-help"
                />
                <p id="link-custom-help" className="mt-1 text-xs text-gray-600" aria-live="polite">
                  {!custom.trim()
                    ? "Name it in your own words. It shows in Results by this name."
                    : !customTag
                      ? "Use at least one letter or number."
                      : samePlace
                        ? `That's the same as “${samePlace.label}”, so it counts there.`
                        : `Shows in Results as “${sourceLabel(customTag)}”.`}
                </p>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="link-start" className="mb-1 block text-sm font-semibold text-deep-navy">
              Opens on
            </label>
            <select id="link-start" className="form-input text-sm" value={start} onChange={(e) => { setStart(e.target.value); }}>
              <option value="">&ldquo;{funnel.cover.heading}&rdquo; topic choices</option>
              {funnel.reels.map((r) => (
                <option key={r.id} value={r.id}>Video: {r.title}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-600">
              Start on one video for a post or follow-up text about that topic.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 rounded-lg bg-soft-gray p-3 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 break-all text-sm text-deep-navy" aria-label="Your link">
            {url}
          </code>
          <div className="flex gap-2">
            {/* Keyed by the link: a new link starts as "Copy link" again. */}
            <CopyButton
              key={url}
              text={url}
              label="Copy link"
              announce="Link copied"
              className={
                organizer
                  ? "min-h-11 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-gray-50"
                  : "min-h-11 rounded-md bg-deep-navy px-4 text-sm font-bold text-white hover:bg-royal-blue"
              }
            />
            <a href={path} target="_blank" rel="noopener" className="flex min-h-11 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-gray-50">
              Open
            </a>
          </div>
        </div>
        {start && (
          <p className="mt-2 text-xs text-gray-600">
            Opens on &ldquo;{funnelReel(funnel, start)?.title}&rdquo;, then follows the funnel&apos;s paths from there.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5" aria-labelledby="sources-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="sources-title" className="text-base font-bold text-deep-navy">Which links bring {wonLabel}</h2>
            <p className="text-sm text-gray-600">
              {tickets ? "Ticket clicks" : "Calls and booking requests"} per 100 visitors, by where the link was shared.
            </p>
          </div>
          <div className="flex rounded-md border border-gray-300 bg-white p-1" role="group" aria-label="Date range">
            {ranges.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range.days === r.days}
                className={`min-h-11 rounded px-3 text-sm font-semibold transition-colors ${range.days === r.days ? "bg-deep-navy text-white" : "text-gray-700 hover:bg-soft-gray"}`}
              >
                <span className="sr-only">Last </span>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {!results || !rows.length ? (
          <p role={error ? "alert" : "status"} className={`rounded-lg px-4 py-5 text-sm ${error ? "bg-amber-50 text-amber-900" : "bg-soft-gray text-gray-600"}`}>
            {error || (results ? "No visits in this period yet. Share your link and they'll show up here." : "Loading results…")}
          </p>
        ) : (
        <div className="overflow-x-auto">
          <table className={`w-full text-left text-sm ${tickets ? "" : "min-w-[720px]"}`}>
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="py-2 pr-4 font-semibold">Source</th>
                <th className="py-2 pr-4 text-right font-semibold">Visitors</th>
                {!tickets && <th className="py-2 pr-4 text-right font-semibold">Calls</th>}
                <th className="py-2 pr-4 text-right font-semibold">{tickets ? "Ticket clicks" : "Booking requests"}</th>
                {sales && <th className="py-2 pr-4 text-right font-semibold">Tickets sold</th>}
                <th className={`py-2 pr-4 text-right font-semibold ${tickets ? "hidden sm:table-cell" : ""}`}>{tickets ? "Updates sign-ups" : "Text me later"}</th>
                {/* Phones with tickets sold: sold says more than the rate, so the rate waits for a wider screen. */}
                <th className={`py-2 text-right font-semibold sm:w-64 sm:text-left ${sales ? "hidden sm:table-cell" : ""}`}>
                  {/* Phones: "Per 100", the column's full name is in the heading above. */}
                  <span className="hidden sm:inline">{tickets ? "Ticket clicks" : "Calls + bookings"} per</span>
                  <span className="sm:hidden">Per</span> 100
                </th>
              </tr>
            </thead>
            <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
              {rows.map((r) => (
                <tr key={r.tag ?? "direct"} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4">
                    <span className="font-medium text-deep-navy">{sourceLabel(r.tag)}</span>
                    {r.tag && <span className="ml-2 hidden text-xs text-gray-600 sm:inline">src={r.tag}</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-right">{formatNumber(r.visitors)}</td>
                  {!tickets && <td className="py-2.5 pr-4 text-right">{formatNumber(r.calls)}</td>}
                  <td className="py-2.5 pr-4 text-right">{formatNumber(r.bookings)}</td>
                  {sales && <td className="py-2.5 pr-4 text-right font-semibold text-deep-navy">{formatNumber(r.sold)}</td>}
                  <td className={`py-2.5 pr-4 text-right ${tickets ? "hidden sm:table-cell" : ""}`}>{formatNumber(r.textLater)}</td>
                  <td className={`py-2.5 ${sales ? "hidden sm:table-cell" : ""}`}>
                    <div className="flex items-center gap-2">
                      <div className="hidden h-3 flex-1 rounded-sm sm:block" style={{ background: viz.grid }} aria-hidden="true">
                        <div className="h-3 rounded-sm" style={{ width: `${(r.per100 / maxPer100) * 100}%`, background: viz.series1 }} />
                      </div>
                      <span className="ml-auto w-10 text-right font-semibold text-deep-navy">{r.per100.toFixed(1)}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {sales && sales.other > 0 && (
                <tr className="border-b border-gray-100 text-gray-600">
                  <td className="py-2.5 pr-4">Eventbrite (other)</td>
                  <td className="py-2.5 pr-4 text-right" aria-label="Not tracked">–</td>
                  <td className="py-2.5 pr-4 text-right" aria-label="Not tracked">–</td>
                  <td className="py-2.5 pr-4 text-right font-semibold text-deep-navy">{formatNumber(sales.other)}</td>
                  <td className="hidden py-2.5 pr-4 text-right sm:table-cell" aria-label="Not tracked">–</td>
                  <td className="hidden py-2.5 text-right sm:table-cell" aria-label="Not tracked">–</td>
                </tr>
              )}
            </tbody>
            <tfoot style={{ fontVariantNumeric: "tabular-nums" }}>
              <tr className="font-semibold text-deep-navy">
                <td className="py-2.5 pr-4">All sources</td>
                <td className="py-2.5 pr-4 text-right">{formatNumber(totals.visitors)}</td>
                {!tickets && <td className="py-2.5 pr-4 text-right">{formatNumber(totals.calls)}</td>}
                <td className="py-2.5 pr-4 text-right">{formatNumber(totals.bookings)}</td>
                {sales && <td className="py-2.5 pr-4 text-right">{formatNumber(totals.sold + sales.other)}</td>}
                <td className={`py-2.5 pr-4 text-right ${tickets ? "hidden sm:table-cell" : ""}`}>{formatNumber(totals.textLater)}</td>
                <td className={`py-2.5 text-right ${sales ? "hidden sm:table-cell" : ""}`}>
                  {per100(totals).toFixed(1)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        )}
        <p className="mt-3 text-xs text-gray-600">
          {tickets
            ? "Updates sign-ups get event news by text and aren't counted until they click Tickets."
            : "“Text me later” requests get the next video by text and aren't counted as calls until they call or book."}
          {sales && " Tickets sold are Eventbrite orders placed through each link; orders without your link's code show as Eventbrite (other)."}
        </p>
        {tickets && results && !sales && <SalesHint className="mt-1" />}
      </section>
    </div>
  );
}

/** A tag from words: lowercase, letters and numbers, dashes between words, 40 at most. */
function slugify(words: string) {
  return words
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f'\u2019]/g, "")
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}
