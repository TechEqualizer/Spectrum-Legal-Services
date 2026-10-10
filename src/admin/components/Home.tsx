"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { selectAdminBusiness, useAdminEvents, type AdminEvent } from "@/admin/AdminBusiness";
import StatTile, { TileGrid } from "@/admin/components/StatTile";
import ViewsChart from "@/admin/components/ViewsChart";
import Welcome from "@/admin/components/Welcome";
import { CheckIcon } from "@/admin/components/ui/icons";
import { showsFans, useFanCounts, type FanCounts } from "@/admin/fan-counts";
import { useAllResults, type EventResults } from "@/admin/results";
import { useAdminSession } from "@/admin/session";
import { useSourceLabel } from "@/admin/source-names";
import { formatNumber, formatPercent } from "@/admin/viz";
import type { FunnelEvent, Reel, ReelMedia } from "@/data/funnel-types";
import { eventDaysAway, eventWhen } from "@/lib/event-time";
import { upcomingEvents } from "@/lib/events";
import { REEL_DRIVERS, REEL_ROLES, coreReels } from "@/lib/funnel-draft";
import { sceneMediaOf, thumbnailOf } from "@/lib/media";

const DAYS = 30;
const change = (now: number, before: number) => (before ? now / before - 1 : undefined);
const rate = (part: number, whole: number) => (whole ? part / whole : 0);

/**
 * Home: where the admin lands. Every event they run at a glance: the last
 * 30 days across all of them, the next night and what it still needs (the
 * opening scene and the three core reels), the reels doing best, and where
 * visitors come from. Each part opens the event in the studio.
 */
export default function Home() {
  const router = useRouter();
  const session = useAdminSession();
  const events = useAdminEvents();
  const { results, failed } = useAllResults(DAYS);
  const fanCounts = useFanCounts(events, DAYS);
  const first = session.name?.trim().split(/\s+/)[0];
  // Just claimed from the sign-up wizard: their new link, and what's next.
  const welcomeSlug = useSearchParams().get("welcome");
  const welcome = welcomeSlug ? events.find((e) => e.funnel.slug === welcomeSlug) : undefined;

  const open = (slug: string) => {
    selectAdminBusiness(slug);
    router.push("/admin");
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Your events</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-deep-navy md:text-4xl">
            {welcome ? `Welcome to Showlnk, ${welcome.organizer.name}` : first ? `Welcome back, ${first}` : "Welcome back"}
          </h1>
          {events.length > 0 && (
            <p className="mt-1 text-sm text-gray-600">
              {events.length === 1 ? "Your event" : `All ${events.length} events`} over the last {DAYS} days.
            </p>
          )}
        </div>
      </div>

      {welcome && <Welcome event={welcome} onOpen={open} onClose={() => router.replace("/admin/home")} />}

      {events.length === 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center">
          <h2 className="text-lg font-bold text-deep-navy">No events yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">Add your first event: import its flyer and you get the opening scene and three reels that sell the night.</p>
          <Link href="/admin/events" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue">
            Go to Events
          </Link>
        </section>
      ) : (
        <>
          {!results ? (
            <p role="status" className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-sm text-gray-600">
              Loading your numbers…
            </p>
          ) : (
            <>
              {failed > 0 && (
                <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
                  {failed === 1 ? "One event's numbers" : `${failed} events' numbers`} couldn&apos;t load, so they&apos;re left out. Reload to try again.
                </p>
              )}
              <Totals results={results} fans={showsFans(fanCounts) ? fanCounts! : undefined} />
            </>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <NextUp events={events} onOpen={open} />
            {results && <Sources results={results} />}
          </div>

          {results && <TopReels results={results} onOpen={open} />}
          {results && <Daily results={results} />}
        </>
      )}
    </div>
  );
}

/** A reel's media that's just the opening scene's picture (the flyer), not a video of its own. */
const isFlyerOnly = (media: ReelMedia, scene: ReelMedia | undefined) =>
  media.kind === "image" && scene?.kind === "image" && media.src === scene.src;

/** The headline numbers, summed across events, against the 30 days before. */
function Totals({ results, fans }: { results: EventResults[]; fans?: FanCounts[] }) {
  const sum = (pick: (r: EventResults) => number) => results.reduce((n, r) => n + pick(r), 0);
  const views = sum((r) => r.results.current.views);
  const before = sum((r) => r.results.previous.views);
  const tickets = sum((r) => r.results.current.booked);
  const ticketsBefore = sum((r) => r.results.previous.booked);
  const updates = sum((r) => r.results.sources.reduce((n, s) => n + s.textLater, 0));
  // Tickets sold, once any of these events' organizers has Eventbrite connected.
  const withSales = results.filter((r) => r.results.sales);
  const sold = withSales.reduce((n, r) => n + r.results.sales!.current, 0);
  const soldBefore = withSales.reduce((n, r) => n + r.results.sales!.previous, 0);
  const period = `${DAYS} days`;
  const tiles = [
    <StatTile key="views" label="Reel views" value={formatNumber(views)} delta={change(views, before)} periodLabel={period} />,
    <StatTile key="tickets" label="Ticket clicks" value={formatNumber(tickets)} delta={change(tickets, ticketsBefore)} periodLabel={period} />,
    withSales.length > 0 && <StatTile key="sold" label="Tickets sold" value={formatNumber(sold)} delta={change(sold, soldBefore)} periodLabel={period} />,
    <StatTile
      key="rate"
      label="Views to tickets"
      value={views ? `${(rate(tickets, views) * 100).toFixed(1)}%` : "–"}
      delta={views && before ? change(rate(tickets, views), rate(ticketsBefore, before)) : undefined}
      periodLabel={period}
    />,
    <StatTile key="updates" label="Update sign-ups" value={formatNumber(updates)} periodLabel={period} />,
    fans && <FollowersTile key="fans" counts={fans} period={period} />,
  ].filter(Boolean);
  return <TileGrid>{tiles}</TileGrid>;
}

/** New followers across the organizers, with how many follow in all. */
function FollowersTile({ counts, period }: { counts: FanCounts[]; period: string }) {
  const sum = (pick: (c: FanCounts) => number) => counts.reduce((n, c) => n + pick(c), 0);
  const current = sum((c) => c.current);
  return (
    <Link href="/admin/leads/fans" className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-navy [&>div]:h-full [&>div]:transition-colors hover:[&>div]:border-gray-300">
      <StatTile
        label="New followers"
        value={formatNumber(current)}
        delta={change(current, sum((c) => c.previous))}
        periodLabel={period}
        note={`${formatNumber(sum((c) => c.following))} following in all`}
      />
    </Link>
  );
}

/** When a date is, from today: "Tonight", "Tomorrow", "In 12 days". */
function countdown(date: FunnelEvent, now: number) {
  // Counted on the event's own calendar.
  const days = eventDaysAway(date, now);
  return days <= 0 ? "Tonight" : days === 1 ? "Tomorrow" : `In ${days} days`;
}

/** The next night across every event, and what it still needs: the opening scene and the three core reels. */
function NextUp({ events, onOpen }: { events: AdminEvent[]; onOpen: (slug: string) => void }) {
  const id = useId();
  const [now] = useState(() => Date.now());
  const next = events
    .flatMap((e) => upcomingEvents(e.live, now).slice(0, 1).map((date) => ({ e, date })))
    .sort((a, b) => Date.parse(a.date.startsAt) - Date.parse(b.date.startsAt))[0];

  if (!next) {
    return (
      <section aria-labelledby={id} data-tour="home-next" className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
        <h2 id={id} className="text-base font-bold text-deep-navy">Next up</h2>
        <p className="mt-1 text-sm text-gray-600">No upcoming dates. Add the next night to an event, or start a new one.</p>
        <Link href="/admin/events" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue">
          Go to Events
        </Link>
      </section>
    );
  }

  const { e, date } = next;
  const scene = sceneMediaOf(e.live);
  const title = e.live.cover.hero?.title ?? date.name;
  const opening = Boolean(scene);
  const steps = [
    { name: "Opening scene", hint: "What people see first", state: opening ? "ready" : "missing" },
    ...coreReels(e.live.reels).map(({ role, reel }) => ({
      name: REEL_ROLES[role],
      hint: REEL_DRIVERS[role].question,
      // A reel showing only the flyer (as a new link's do) still needs its video.
      state: !reel ? "missing" : reel.media && !isFlyerOnly(reel.media, scene) ? "ready" : "video",
    })),
  ] as { name: string; hint: string; state: "ready" | "video" | "missing" }[];
  const left = steps.filter((s) => s.state !== "ready").length;

  return (
    <section aria-labelledby={id} data-tour="home-next" className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start gap-4">
        <span className="relative h-24 w-[4.5rem] flex-shrink-0 overflow-hidden rounded-lg bg-deep-navy" aria-hidden="true">
          <EventPoster scene={scene} reels={e.live.reels} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{countdown(date, now)}</p>
          <h2 id={id} className="mt-0.5 text-xl font-bold leading-tight text-deep-navy">
            <span className="sr-only">Next up: </span>
            {title}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {eventWhen(date)}
            {date.venue ? ` · ${date.venue}` : ""}
          </p>
          <p className="mt-0.5 text-sm text-gray-600">{e.organizer.name}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpen(e.funnel.slug)}
          className="min-h-11 w-full rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue sm:w-auto"
        >
          Open in Reels
        </button>
      </div>

      <h3 className="mt-5 text-sm font-bold text-deep-navy">
        The four things {left ? <span className="font-normal text-gray-600">· {left} to finish</span> : <span className="font-normal text-gray-600">· all set</span>}
      </h3>
      <ol role="list" className="mt-2 grid gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.name}>
            <button
              type="button"
              onClick={() => onOpen(e.funnel.slug)}
              aria-label={`${s.name}: ${s.state === "ready" ? "ready" : s.state === "video" ? "needs video" : "missing"}. Open in Reels.`}
              className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-left hover:bg-soft-gray"
            >
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                  s.state === "ready" ? "bg-teal-accent/20 text-teal-800" : s.state === "video" ? "bg-amber-100 text-amber-900" : "border border-dashed border-gray-400 text-gray-600"
                }`}
              >
                {s.state === "ready" ? <CheckIcon /> : s.state === "video" ? "!" : "+"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-deep-navy">{s.name}</span>
                <span className="block truncate text-xs text-gray-600">{s.hint}</span>
              </span>
              <span className={`flex-shrink-0 text-xs font-semibold ${s.state === "ready" ? "text-teal-800" : s.state === "video" ? "text-amber-900" : "text-gray-600"}`}>
                {s.state === "ready" ? "Ready" : s.state === "video" ? "Needs video" : "Missing"}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Where visitors came from across every event: the tagged links in bios, texts and ads. */
function Sources({ results }: { results: EventResults[] }) {
  const id = useId();
  const labelOf = useSourceLabel(results.map((r) => r.event));
  const byTag = new Map<string, { visitors: number; tickets: number; sold: number }>();
  for (const { results: r } of results) {
    for (const s of r.sources) {
      const t = byTag.get(s.tag ?? "") ?? { visitors: 0, tickets: 0, sold: 0 };
      byTag.set(s.tag ?? "", { visitors: t.visitors + s.visitors, tickets: t.tickets + s.bookings, sold: t.sold + s.sold });
    }
  }
  // Tickets sold shows once any event's organizer has Eventbrite connected.
  const showSold = results.some((r) => r.results.sales);
  const rows = [...byTag].filter(([, t]) => t.visitors > 0 || t.sold > 0).sort((a, b) => b[1].visitors - a[1].visitors || b[1].sold - a[1].sold).slice(0, 5);
  const most = rows[0]?.[1].visitors ?? 0;
  return (
    <section aria-labelledby={id} className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 id={id} className="text-base font-bold text-deep-navy">Where visitors came from</h2>
      <p className="text-sm text-gray-600">Last {DAYS} days, all events</p>
      {rows.length ? (
        <ul role="list" className="mt-4 space-y-3">
          {rows.map(([tag, t]) => (
            <li key={tag}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-deep-navy">{labelOf(tag)}</span>
                <span className="flex-shrink-0 text-gray-600">
                  {formatNumber(t.visitors)} {t.visitors === 1 ? "visitor" : "visitors"} · {formatNumber(t.tickets)} {t.tickets === 1 ? "ticket click" : "ticket clicks"}
                  {showSold && <> · <span className="font-semibold text-deep-navy">{formatNumber(t.sold)} sold</span></>}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-soft-gray" aria-hidden="true">
                <div className="h-full rounded-full bg-deep-navy" style={{ width: `${Math.max(4, most ? (t.visitors / most) * 100 : 0)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-gray-600">No visitors yet. Share your links from Share and they&apos;ll show here.</p>
      )}
    </section>
  );
}

/** The reels doing best across every event, by views, with how often they turn into a ticket click. */
function TopReels({ results, onOpen }: { results: EventResults[]; onOpen: (slug: string) => void }) {
  const id = useId();
  const rows = results
    .flatMap(({ event, results: r }) => r.reels.map((t) => ({ event, ...t })))
    .filter((t) => t.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);
  return (
    <section aria-labelledby={id} className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 id={id} className="text-base font-bold text-deep-navy">Top reels</h2>
      <p className="text-sm text-gray-600">Most watched in the last {DAYS} days, across all events</p>
      {rows.length ? (
        <ol role="list" className="-mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
          {rows.map((t, i) => {
            const poster = thumbnailOf(t.reel.media);
            return (
              <li key={`${t.event.funnel.slug}/${t.reel.id}`} className="w-36 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onOpen(t.event.funnel.slug)}
                  aria-label={`${i + 1}. ${t.reel.title}, ${t.event.live.cover.hero?.title ?? t.event.funnel.brand.name}: ${formatNumber(t.views)} views, ${formatPercent(rate(t.booked, t.views))} to tickets. Open in Reels.`}
                  className="block w-full rounded-lg text-left hover:opacity-90"
                >
                  <span className="relative block aspect-[9/14] overflow-hidden rounded-lg bg-deep-navy" aria-hidden="true">
                    {poster && (
                      // eslint-disable-next-line @next/next/no-img-element -- the reel's own poster
                      <img src={poster} alt="" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 text-xs font-bold leading-5 text-white">{i + 1}</span>
                  </span>
                  <span className="mt-2 block line-clamp-2 text-sm font-semibold leading-snug text-deep-navy">{t.reel.title}</span>
                  <span className="block truncate text-xs text-gray-600">{t.event.live.cover.hero?.title ?? t.event.funnel.brand.name}</span>
                  <span className="mt-0.5 block text-xs text-gray-600">
                    {formatNumber(t.views)} views · <span className="font-semibold text-deep-navy">{formatPercent(rate(t.booked, t.views))}</span> to tickets
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-gray-600">No views yet. Your reels show here once people open your links.</p>
      )}
    </section>
  );
}

/** Reel views per day across every event. */
function Daily({ results }: { results: EventResults[] }) {
  const id = useId();
  // Every event's days line up (same period, same day), so add them by position.
  const daily = results[0]?.results.daily.map((d, i) => ({ date: d.date, views: results.reduce((n, r) => n + (r.results.daily[i]?.views ?? 0), 0) })) ?? [];
  if (!daily.length) return null;
  return (
    <section aria-labelledby={id} className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 id={id} className="text-base font-bold text-deep-navy">Views by day</h2>
      <p className="mb-4 text-sm text-gray-600">All events combined. Hover or use the arrow keys for each day.</p>
      <ViewsChart data={daily} />
    </section>
  );
}

/**
 * The event's picture: the opening scene's still, else its first frame (a
 * video uploaded without one), else the first reel with a picture (often
 * the flyer). Empty only when the event has nothing to show yet.
 */
function EventPoster({ scene, reels }: { scene: ReelMedia | undefined; reels: Reel[] }) {
  const sceneStill = thumbnailOf(scene);
  const still = sceneStill ?? reels.map((r) => thumbnailOf(r.media)).find(Boolean);
  // A video without a still: its frame (#t: just in, not a possibly black
  // first one), over a reel's picture for browsers that won't load a frame
  // before it plays (iPhones).
  const frame = !sceneStill && scene?.kind === "video" ? `${scene.src}#t=0.5` : undefined;
  return (
    <>
      {still && (
        // eslint-disable-next-line @next/next/no-img-element -- the event's own poster
        <img src={still} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
      )}
      {frame && <video src={frame} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover object-top" />}
    </>
  );
}
