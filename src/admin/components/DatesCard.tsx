"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FunnelEvent } from "@/data/funnel-types";
import { eventDate, eventDay, eventDayOfMonth, eventWhen, instantToZoned, isTimeZone, localTimeZone, zonedToInstant, zoneName } from "@/lib/event-time";
import { isOver } from "@/lib/events";
import CoreNote from "@/admin/components/CoreNote";
import FlyerImportSheet, { type FlyerFound, type FunnelDraft, type ImportedDate } from "@/admin/components/FlyerImportSheet";
import { useHasCore } from "@/admin/plan";
import type { Look } from "@/lib/look";
import { PlusIcon } from "@/admin/components/ui/icons";

type Status = NonNullable<FunnelEvent["status"]>;

const STATUS: { id: Status; label: string }[] = [
  { id: "on_sale", label: "On sale" },
  { id: "few_left", label: "Few left" },
  { id: "sold_out", label: "Sold out" },
];

/**
 * Where a date's clock is: its own time zone, else (an older date, or a new
 * one) this browser's. Dates are entered and shown on that clock, so an
 * 8 PM Detroit night reads 8 PM to an admin anywhere.
 */
const zoneOf = (e?: Pick<FunnelEvent, "timeZone">) => (isTimeZone(e?.timeZone) ? e.timeZone : localTimeZone());
/** The date and time fields' values, on the date's clock. */
const toFields = (e: FunnelEvent) => instantToZoned(e.startsAt, zoneOf(e));
/** "2026-10-31" plus n days. */
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/**
 * The event's dates, as rows: tap one to edit it, or add the next one.
 * Each date shows on the opening screen as a story circle.
 */
/** A reel a date can open with, in funnel order. */
export type DateReel = { id: string; title: string; eventId?: string };
/** Which reel a date opens: a reel id, "" for the first reel that sells it, or "new" to make one. */
export type ReelChoice = string;

export default function DatesCard({
  slug,
  events,
  reels,
  edited,
  onChange,
  onSave,
  onLook,
  onDraft,
  inStudio = false,
  openImport = false,
}: {
  slug: string;
  events: FunnelEvent[];
  reels: DateReel[];
  /** Differs from what's live. */
  edited: boolean;
  onChange: (events: FunnelEvent[], message: string, undo?: () => void) => void;
  /** Saves a date and links its reel. */
  onSave: (event: FunnelEvent, reel: ReelChoice, isNew: boolean) => void;
  /** Use a flyer's look (and the flyer itself, as an upload link, behind the opening screen). */
  onLook: (look: Look, flyer: string | undefined, asBackground: boolean) => void;
  /** Use a funnel drafted from a flyer. */
  onDraft: (draft: FunnelDraft) => void;
  /** In the studio, where its story step names it. */
  inStudio?: boolean;
  /** Open Import flyer right away (a new event, made to be filled from its flyer). */
  openImport?: boolean;
}) {
  // The editor's clock: read once, so rows don't jump between upcoming and past while open.
  const [now] = useState(() => Date.now());
  const [editing, setEditing] = useState<{ event: FunnelEvent; isNew: boolean; imported?: number } | null>(null);
  // Presales for followers are part of Core.
  const core = useHasCore(slug);
  // Flyer import: the sheet is open, what it found, and which of those are added.
  const [importing, setImporting] = useState(openImport);
  const [found, setFound] = useState<FlyerFound | null>(null);
  const [added, setAdded] = useState<Set<number>>(() => new Set());
  const sorted = [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const upcoming = sorted.filter((e) => !isOver(e, now));
  const past = sorted.filter((e) => isOver(e, now)).reverse();

  /** The reel a date opens now: its chosen one, else the first reel that sells it. */
  const opener = (e: FunnelEvent) =>
    (e.reelId ? reels.find((r) => r.id === e.reelId) : undefined) ?? reels.find((r) => r.eventId === e.id);
  const save = (event: FunnelEvent, reel: ReelChoice) => {
    onSave(event, reel, !events.some((e) => e.id === event.id));
    if (editing?.imported !== undefined) {
      const done = new Set(added).add(editing.imported);
      setAdded(done);
      // Back to the list while there's more to do there.
      if (found && moreToDo(found, done)) setImporting(true);
      else closeImport();
    }
    setEditing(null);
  };
  /** Dates left to review, a look not used, or a funnel not drafted yet. */
  const moreToDo = (f: FlyerFound, done: Set<number>) =>
    f.dates.some((_, i) => !done.has(i)) || Boolean(f.look && !f.lookUsed) || Boolean(f.source && !f.draftUsed);
  const closeImport = () => {
    setImporting(false);
    setFound(null);
    setAdded(new Set());
  };
  const days = new Set(events.map((e) => eventDay(e)));
  const review = (index: number, dates = found?.dates ?? []) => {
    setImporting(false);
    setEditing({ event: fromFlyer(dates[index], sorted), isNew: true, imported: index });
  };
  const onFound = (result: FlyerFound | null) => {
    setFound(result);
    setAdded(new Set());
    // One new date and no look to offer: straight to review.
    if (!result?.look && result?.dates.length === 1 && !days.has(result.dates[0].date)) review(0, result.dates);
  };
  const remove = (event: FunnelEvent) => {
    const before = events;
    onChange(events.filter((e) => e.id !== event.id), "Date deleted", () => onChange(before, "Date restored"));
    setEditing(null);
  };

  return (
    <section aria-labelledby="dates-title" className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-gray-100 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 id="dates-title" className={inStudio ? "sr-only" : "font-bold text-deep-navy"}>Dates</h2>
          <p className="text-xs text-gray-600">
            <span className={inStudio ? "sr-only" : undefined}>Shown as circles on your opening screen.</span>
            {edited && <span className="font-semibold text-amber-800"> Not published.</span>}
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setImporting(true)}
            className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-semibold text-deep-navy hover:bg-soft-gray"
          >
            Import flyer
          </button>
          <button
            type="button"
            onClick={() => setEditing({ event: newDate(sorted), isNew: true })}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-gray-300 px-3 text-sm font-semibold text-deep-navy hover:bg-soft-gray"
          >
            <PlusIcon />
            Add date
          </button>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-600">No upcoming dates. Add your next event so people can get tickets.</p>
      ) : (
        <ul role="list" className="divide-y divide-gray-100">
          {upcoming.map((e) => (
            <DateRow key={e.id} event={e} reel={opener(e)?.title} onClick={() => setEditing({ event: e, isNew: false })} />
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <details className="group border-t border-gray-100">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-gray-600 sm:px-5">
            Past dates ({past.length})
            <svg className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9l-7 7-7-7" /></svg>
          </summary>
          <ul role="list" className="divide-y divide-gray-100 border-t border-gray-100">
            {past.map((e) => (
              <DateRow key={e.id} event={e} reel={opener(e)?.title} past onClick={() => setEditing({ event: e, isNew: false })} />
            ))}
          </ul>
        </details>
      )}

      {editing && (
        <DateSheet
          key={editing.event.id}
          event={editing.event}
          isNew={editing.isNew}
          imported={editing.imported !== undefined && found ? found.dates[editing.imported] : undefined}
          reels={reels}
          events={events}
          initialReel={editing.imported !== undefined ? "" : editing.isNew ? "new" : opener(editing.event)?.id ?? ""}
          core={core}
          onSave={save}
          onDelete={editing.isNew ? undefined : () => remove(editing.event)}
          onClose={() => {
            // Closing a reviewed date goes back to the flyer's list.
            if (editing.imported !== undefined && found && (found.dates.length > 1 || found.look)) setImporting(true);
            else if (editing.imported !== undefined) closeImport();
            setEditing(null);
          }}
        />
      )}

      {importing && (
        <FlyerImportSheet
          slug={slug}
          found={found}
          added={added}
          taken={days}
          onFound={onFound}
          onReview={review}
          onLook={(look, flyer, asBackground) => {
            onLook(look, flyer, asBackground);
            setFound((f) => (f ? { ...f, lookUsed: true } : f));
            // Nothing else to do here: close.
            if (found && !moreToDo({ ...found, lookUsed: true }, added)) closeImport();
          }}
          onDrafted={(draft) => setFound((f) => (f ? { ...f, draft } : f))}
          onDraft={(draft) => {
            onDraft(draft);
            setFound((f) => (f ? { ...f, draftUsed: true } : f));
            if (found && !moreToDo({ ...found, draftUsed: true }, added)) closeImport();
          }}
          onClose={closeImport}
        />
      )}
    </section>
  );
}

/** A new date: a week after the last one, at the same time on the same clock, with the same details. */
function newDate(sorted: FunnelEvent[]): FunnelEvent {
  const last = sorted[sorted.length - 1];
  const timeZone = zoneOf(last);
  const from = last ? toFields(last) : { date: instantToZoned(new Date().toISOString(), timeZone).date, time: "19:00" };
  let date = addDays(from.date, 7);
  const at = () => zonedToInstant(date, from.time, timeZone) ?? new Date().toISOString();
  while (Date.parse(at()) < Date.now()) date = addDays(date, 7);
  return {
    id: `ev-${Date.now().toString(36)}`,
    name: last?.name.split(": ")[0] ?? "",
    startsAt: at(),
    ...(timeZone ? { timeZone } : {}),
    venue: last?.venue,
    price: last?.price,
    ticketUrl: "",
  };
}

/** A new date from what the flyer says. Anything it left out stays empty, for the admin to fill. */
function fromFlyer(d: ImportedDate, sorted: FunnelEvent[]): FunnelEvent {
  const last = sorted[sorted.length - 1];
  // On the same clock as the other dates (else this browser's).
  const timeZone = zoneOf(last);
  return {
    id: `ev-${Date.now().toString(36)}`,
    name: d.name || (last?.name.split(": ")[0] ?? ""),
    // No time on the flyer: the time of the last date, else 7 PM.
    startsAt: zonedToInstant(d.date, d.time || (last ? toFields(last).time : "19:00"), timeZone) ?? new Date().toISOString(),
    ...(timeZone ? { timeZone } : {}),
    ...(d.venue ? { venue: d.venue } : {}),
    ...(d.price ? { price: d.price } : {}),
    ticketUrl: d.ticketUrl,
  };
}

function DateRow({ event, reel, past = false, onClick }: { event: FunnelEvent; reel?: string; past?: boolean; onClick: () => void }) {
  const status = past ? "Past" : STATUS.find((s) => s.id === (event.status ?? "on_sale"))!.label;
  return (
    <li>
      <button type="button" onClick={onClick} className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-soft-gray sm:px-5">
        <span className={`flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl leading-none ${past ? "bg-gray-100 text-gray-500" : "bg-deep-navy text-white"}`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider ${past ? "" : "text-sky-accent"}`}>{eventDate(event, { month: "short" })}</span>
          <span className="mt-0.5 text-lg font-bold">{eventDayOfMonth(event)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-deep-navy">{event.name}</span>
          <span className="block truncate text-xs text-gray-600">
            {eventWhen(event)}
            {event.price ? ` · ${event.price}` : ""}
          </span>
          {!past && (
            <span className={`block truncate text-xs ${reel ? "text-gray-500" : "font-semibold text-amber-800"}`}>
              {reel ? <><span aria-hidden="true">&#9654; </span>{reel}</> : "No reel yet"}
            </span>
          )}
        </span>
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            past ? "bg-gray-100 text-gray-600" : event.status === "sold_out" ? "bg-gray-100 text-gray-700" : event.status === "few_left" ? "bg-amber-100 text-amber-900" : "bg-teal-accent/10 text-teal-accent"
          }`}
        >
          {status}
        </span>
        <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </button>
    </li>
  );
}

function DateSheet({
  event,
  isNew,
  imported,
  reels,
  events,
  initialReel,
  core,
  onSave,
  onDelete,
  onClose,
}: {
  event: FunnelEvent;
  isNew: boolean;
  /** The organizer has Core (undefined: not known yet). */
  core: boolean | undefined;
  /** What the flyer said, when this date came from one. */
  imported?: ImportedDate;
  reels: DateReel[];
  events: FunnelEvent[];
  initialReel: ReelChoice;
  onSave: (event: FunnelEvent, reel: ReelChoice) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  // The date's own clock; an older date without one takes this browser's.
  const timeZone = zoneOf(event);
  const initial = toFields(event);
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [venue, setVenue] = useState(event.venue ?? "");
  const [price, setPrice] = useState(event.price ?? "");
  const [ticketUrl, setTicketUrl] = useState(event.ticketUrl);
  const [status, setStatus] = useState<Status>(event.status ?? "on_sale");
  // A presale for followers: its link and window, on the date's own clock.
  const [presaleOn, setPresaleOn] = useState(Boolean(event.presale));
  const [presaleUrl, setPresaleUrl] = useState(event.presale?.url ?? "");
  const [opens, setOpens] = useState(() => instantToZoned(event.presale?.opensAt ?? new Date().toISOString(), timeZone));
  const [ends, setEnds] = useState(() => instantToZoned(event.presale?.endsAt ?? new Date(Date.now() + 2 * 864e5).toISOString(), timeZone));
  const [reel, setReel] = useState<ReelChoice>(initialReel);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Where the chosen reel sells tickets now, if that's another date (choosing it moves it here).
  const chosen = reels.find((r) => r.id === reel);
  const movesFrom = chosen?.eventId && chosen.eventId !== event.id ? events.find((e) => e.id === chosen.eventId) : undefined;
  const shortDate = (e: FunnelEvent) => eventDate(e, { month: "short", day: "numeric" });
  useEffect(() => ref.current?.showModal(), []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problems: Record<string, string> = {};
    if (!name.trim()) problems.name = "Give the date a name.";
    const start = date ? zonedToInstant(date, time || "00:00", timeZone) : undefined;
    if (!start) problems.date = "Pick a date.";
    try {
      if (new URL(ticketUrl.trim()).protocol !== "https:") throw new Error();
    } catch {
      problems.ticketUrl = "Paste the ticket page link, starting with https://.";
    }
    let presale: FunnelEvent["presale"];
    if (presaleOn) {
      try {
        if (new URL(presaleUrl.trim()).protocol !== "https:") throw new Error();
      } catch {
        problems.presaleUrl = "Paste the presale link (your access-code or hidden ticket link), starting with https://.";
      }
      const opensAt = zonedToInstant(opens.date, opens.time || "00:00", timeZone);
      const endsAt = zonedToInstant(ends.date, ends.time || "00:00", timeZone);
      if (!opensAt || !endsAt || Date.parse(endsAt) <= Date.parse(opensAt)) problems.presaleWindow = "The presale must end after it opens.";
      else presale = { opensAt, endsAt, url: presaleUrl.trim() };
    }
    setErrors(problems);
    if (Object.keys(problems).length) return;
    onSave({
      ...(event.reelId ? { reelId: event.reelId } : {}),
      id: event.id,
      name: name.trim(),
      startsAt: start!,
      ...(timeZone ? { timeZone } : {}),
      ticketUrl: ticketUrl.trim(),
      ...(venue.trim() ? { venue: venue.trim() } : {}),
      ...(price.trim() ? { price: price.trim() } : {}),
      ...(status !== "on_sale" ? { status } : {}),
      ...(presale ? { presale } : {}),
    }, reel);
  };

  const field = "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-charcoal focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-accent";
  const err = (k: string) =>
    errors[k] ? <p id={`${id}-${k}-error`} role="alert" className="mt-1 text-xs font-semibold text-red-700">{errors[k]}</p> : null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      className="m-auto max-h-[92dvh] w-[min(30rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-soft-gray p-0 text-charcoal shadow-2xl backdrop:bg-deep-navy/60"
    >
      <form onSubmit={submit} noValidate>
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
          <h2 id={`${id}-title`} className="text-xl font-bold text-deep-navy">{isNew ? "Add date" : "Edit date"}</h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="-mr-2 -mt-1 flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-white hover:text-deep-navy"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-5 px-5 pb-5">
          {imported && <FromFlyer imported={imported} />}
          <div className="divide-y divide-gray-100 rounded-xl bg-white">
            <div className="px-4 py-3">
              <label htmlFor={`${id}-name`} className="text-sm font-semibold text-deep-navy">Name</label>
              <input id={`${id}-name`} className={field} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${id}-name-error` : undefined} />
              {err("name")}
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-3">
              <div>
                <label htmlFor={`${id}-date`} className="text-sm font-semibold text-deep-navy">Date</label>
                <input id={`${id}-date`} type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? `${id}-date-error` : undefined} />
                {err("date")}
              </div>
              <div>
                <label htmlFor={`${id}-time`} className="text-sm font-semibold text-deep-navy">Starts</label>
                <input id={`${id}-time`} type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} aria-describedby={timeZone ? `${id}-zone` : undefined} />
                {/* Whose clock the time is on, so it's never a guess. */}
                {timeZone && <p id={`${id}-zone`} className="mt-1 text-xs text-gray-500">{zoneName(timeZone)} time</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-3">
              <div>
                <label htmlFor={`${id}-price`} className="text-sm font-semibold text-deep-navy">Price</label>
                <input id={`${id}-price`} className={field} maxLength={30} placeholder="From $25" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <label htmlFor={`${id}-venue`} className="text-sm font-semibold text-deep-navy">Venue</label>
                <input id={`${id}-venue`} className={field} maxLength={80} value={venue} onChange={(e) => setVenue(e.target.value)} />
              </div>
            </div>
            <div className="px-4 py-3">
              <label htmlFor={`${id}-tickets`} className="text-sm font-semibold text-deep-navy">Ticket link</label>
              <input
                id={`${id}-tickets`}
                type="url"
                inputMode="url"
                className={field}
                placeholder="https://www.eventbrite.com/e/..."
                value={ticketUrl}
                onChange={(e) => setTicketUrl(e.target.value)}
                aria-invalid={Boolean(errors.ticketUrl)}
                aria-describedby={errors.ticketUrl ? `${id}-ticketUrl-error` : undefined}
              />
              {err("ticketUrl")}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
              <p id={`${id}-presale`} className="text-xs font-semibold uppercase tracking-wider text-gray-500">Presale for followers</p>
              <button
                type="button"
                role="switch"
                aria-checked={presaleOn}
                aria-labelledby={`${id}-presale`}
                aria-describedby={core === false ? `${id}-presale-core` : undefined}
                disabled={core === false && !presaleOn}
                onClick={() => setPresaleOn((on) => !on)}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-accent motion-reduce:transition-none ${presaleOn ? "bg-teal-accent" : "bg-gray-300"}`}
              >
                <span aria-hidden="true" className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${presaleOn ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {presaleOn ? (
              <div className="divide-y divide-gray-100 rounded-xl bg-white">
                <div className="px-4 py-3">
                  <label htmlFor={`${id}-presale-url`} className="text-sm font-semibold text-deep-navy">Presale link</label>
                  <input
                    id={`${id}-presale-url`}
                    type="url"
                    inputMode="url"
                    className={field}
                    placeholder="Your access-code or hidden ticket link"
                    value={presaleUrl}
                    onChange={(e) => setPresaleUrl(e.target.value)}
                    aria-invalid={Boolean(errors.presaleUrl)}
                    aria-describedby={`${id}-presale-help${errors.presaleUrl ? ` ${id}-presaleUrl-error` : ""}`}
                  />
                  {err("presaleUrl")}
                  <p id={`${id}-presale-help`} className="mt-1 text-xs text-gray-500">Only followers get it, during the window. Everyone else sees &ldquo;Fans get tickets first&rdquo;.</p>
                </div>
                {([["Opens", opens, setOpens], ["Ends", ends, setEnds]] as const).map(([label, value, set]) => (
                  <div key={label} className="grid grid-cols-2 gap-3 px-4 py-3">
                    <div>
                      <label htmlFor={`${id}-presale-${label}-date`} className="text-sm font-semibold text-deep-navy">{label}</label>
                      <input id={`${id}-presale-${label}-date`} type="date" className={field} value={value.date} onChange={(e) => set({ ...value, date: e.target.value })} />
                    </div>
                    <div>
                      <label htmlFor={`${id}-presale-${label}-time`} className="text-sm font-semibold text-deep-navy">At</label>
                      <input id={`${id}-presale-${label}-time`} type="time" className={field} value={value.time} onChange={(e) => set({ ...value, time: e.target.value })} />
                      {timeZone && <p className="mt-1 text-xs text-gray-500">{zoneName(timeZone)} time</p>}
                    </div>
                  </div>
                ))}
                {errors.presaleWindow && <div className="px-4 py-2">{err("presaleWindow")}</div>}
              </div>
            ) : (
              <p className="px-1 text-xs text-gray-500">Give followers tickets first, with a link only they get.</p>
            )}
            {core === false && (
              <CoreNote id={`${id}-presale-core`} text={presaleOn ? "Without it, followers won't see this presale." : "Start Core to give your followers tickets first."} />
            )}
          </div>

          <div>
            <label htmlFor={`${id}-reel`} className="mb-1.5 block px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Opens with</label>
            <div className="rounded-xl bg-white px-4 py-3">
              <select id={`${id}-reel`} className={field.replace("mt-1 ", "")} value={reel} onChange={(e) => setReel(e.target.value)} aria-describedby={`${id}-reel-help`}>
                {!isNew && <option value="">First reel for this date</option>}
                {imported && <option value="">Your first reel (link one later)</option>}
                <option value="new">+ New reel for this date</option>
                {reels.map((r, i) => {
                  const other = r.eventId && r.eventId !== event.id ? events.find((e) => e.id === r.eventId) : undefined;
                  return (
                    <option key={r.id} value={r.id}>
                      {i + 1}. {r.title}
                      {other ? ` (now ${shortDate(other)})` : ""}
                    </option>
                  );
                })}
              </select>
              <p id={`${id}-reel-help`} className="mt-1.5 text-xs text-gray-500">
                {reel === "" && imported
                  ? "Plays your first reel until you link one. Its Tickets button sells this date."
                  : reel === "new"
                  ? "After saving, add its video and title. It plays when someone taps this date."
                  : movesFrom
                    ? `Moves this reel from ${shortDate(movesFrom)} to this date. Its Tickets button sells this date.`
                    : "Plays when someone taps this date. Its Tickets button sells this date."}
              </p>
            </div>
          </div>

          <div>
            <p id={`${id}-status`} className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Tickets</p>
            {/* Segmented control */}
            <div role="radiogroup" aria-labelledby={`${id}-status`} className="grid grid-cols-3 gap-1 rounded-xl bg-gray-200/70 p-1">
              {STATUS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={status === s.id}
                  onClick={() => setStatus(s.id)}
                  className={`min-h-10 rounded-lg text-sm font-semibold transition ${status === s.id ? "bg-white text-deep-navy shadow-sm" : "text-gray-600 hover:text-deep-navy"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 px-1 text-xs text-gray-500">
              {status === "sold_out" ? "Its Tickets button sells the next date instead." : status === "few_left" ? "Shows “Few left” on the opening screen." : "Tickets open your ticket page."}
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-gray-200 bg-soft-gray/95 px-5 py-3 backdrop-blur">
          {onDelete && (
            <button type="button" onClick={onDelete} className="mr-auto min-h-11 px-1 text-sm font-semibold text-red-700 hover:underline">
              Delete
            </button>
          )}
          <button type="button" onClick={() => ref.current?.close()} className="ml-auto min-h-11 rounded-lg px-4 text-sm font-semibold text-deep-navy hover:bg-white">
            Cancel
          </button>
          <button type="submit" className="min-h-11 rounded-lg bg-deep-navy px-6 text-sm font-bold text-white hover:bg-royal-blue">
            {isNew ? "Add date" : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** Says the details came from the flyer, and what it left out. */
function FromFlyer({ imported }: { imported: ImportedDate }) {
  const missing = [!imported.time && "start time", !imported.venue && "venue", !imported.price && "price", !imported.ticketUrl && "ticket link"].filter(
    (m): m is string => Boolean(m)
  );
  const list = missing.length > 1 ? `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}` : missing[0];
  return (
    <p className="rounded-xl bg-teal-accent/10 px-4 py-3 text-sm text-deep-navy">
      <span className="font-semibold">Filled in from your flyer.</span> Check it, then add.
      {list && <> The flyer didn’t show the {list}.</>}
    </p>
  );
}
