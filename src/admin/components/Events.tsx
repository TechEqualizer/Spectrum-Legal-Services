"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { selectAdminBusiness, useAdminBusiness, useAdminBusinesses, useAdminEvents, type AdminEvent } from "@/admin/AdminBusiness";
import { builtInBusinesses } from "@/admin/business";
import { requestImport } from "@/admin/import-request";
import { useAdminSession } from "@/admin/session";
import LocalDate from "@/components/LocalDate";
import type { Funnel } from "@/data/funnel-types";
import { isOver, upcomingEvents } from "@/lib/events";
import { sceneMediaOf, thumbnailOf } from "@/lib/media";
import { EVENT_SLUG, slugFromName, type NewEventMode } from "@/lib/new-event";

const useOrigin = () => useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");

/** Where an event stands, from its dates as visitors see them. */
function standing(live: Funnel, now: number) {
  const next = upcomingEvents(live, now)[0];
  if (next) {
    const today = new Date(next.startsAt).toDateString() === new Date(now).toDateString();
    return { next, label: today ? "Tonight" : "Upcoming", tone: "bg-teal-accent/15 text-deep-navy" };
  }
  const dates = live.events ?? [];
  if (!dates.length) return { label: "No dates yet", tone: "bg-amber-50 text-amber-800" };
  const last = [...dates].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0];
  // Started and not over yet: the night is on.
  if (!isOver(last, now)) return { last, label: "On now", tone: "bg-teal-accent/15 text-deep-navy" };
  return { last, label: "Ended", tone: "bg-gray-100 text-gray-600" };
}

/**
 * The organizer's events: each has its own link and its own reels; the
 * permanent link always shows the next one. Open one to edit it in the
 * studio; New event and Duplicate start the next.
 */
export default function Events() {
  const router = useRouter();
  const events = useAdminEvents();
  const allowed = useAdminBusinesses();
  const current = useAdminBusiness();
  const session = useAdminSession();
  const origin = useOrigin();
  const [now] = useState(() => Date.now());
  const [sheet, setSheet] = useState<{ mode: NewEventMode; source?: AdminEvent } | null>(null);
  const canAdd = session.slugs.includes("*") && events.length > 0;

  const organizers = [...new Map(events.map((e) => [e.organizer.slug, e.organizer])).values()];
  const demos = builtInBusinesses.filter((b) => allowed.some((a) => a.funnel.slug === b.funnel.slug));
  const open = (slug: string) => {
    selectAdminBusiness(slug);
    router.push("/admin");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-deep-navy">Events</h1>
          <p className="mt-1 text-sm text-gray-600">Each event has its own link and reels. Open one to edit it.</p>
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={() => setSheet({ mode: "fresh" })}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            New event
          </button>
        )}
      </div>

      {organizers.map((org) => {
        const theirs = events
          .filter((e) => e.organizer.slug === org.slug)
          .map((e) => ({ ...e, standing: standing(e.live, now) }))
          // Upcoming first (soonest first), then the rest, latest first.
          .sort((a, b) => {
            const an = a.standing.next ? Date.parse(a.standing.next.startsAt) : Infinity;
            const bn = b.standing.next ? Date.parse(b.standing.next.startsAt) : Infinity;
            if (an !== bn) return an - bn;
            return Date.parse(b.standing.last?.startsAt ?? "0") - Date.parse(a.standing.last?.startsAt ?? "0");
          });
        return (
          <section key={org.slug} aria-labelledby={`org-${org.slug}`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
              <h2 id={`org-${org.slug}`} className="text-xs font-bold uppercase tracking-wider text-gray-600">{org.name}</h2>
              <PermanentLink href={`${origin}/f/${org.slug}`} />
            </div>
            <ul role="list" className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {theirs.map((e) => (
                <EventRow
                  key={e.funnel.slug}
                  funnel={e.live}
                  current={current.funnel.slug === e.funnel.slug}
                  status={e.standing}
                  onOpen={() => open(e.funnel.slug)}
                  onDuplicate={canAdd ? () => setSheet({ mode: "copy", source: e }) : undefined}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {!events.length && (
        <p className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-sm text-gray-600">
          No events yet. Send Event Reels your flyer and we&apos;ll set up your first one with you.
        </p>
      )}
      {events.length > 0 && !canAdd && (
        <p className="px-1 text-sm text-gray-600">Next event coming up? Send Event Reels the flyer and we&apos;ll add it here.</p>
      )}

      {demos.length > 0 && (
        <section aria-labelledby="demos-title">
          <h2 id="demos-title" className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-600">Demos</h2>
          <ul role="list" className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {demos.map((b) => (
              <EventRow key={b.funnel.slug} funnel={b.funnel} current={current.funnel.slug === b.funnel.slug} onOpen={() => open(b.funnel.slug)} />
            ))}
          </ul>
        </section>
      )}

      {sheet && (
        <NewEventSheet
          mode={sheet.mode}
          source={sheet.source}
          events={events}
          onClose={() => setSheet(null)}
          onCreated={(slug, mode) => {
            selectAdminBusiness(slug);
            // A fresh event is filled from its flyer: the studio opens on Import flyer.
            if (mode === "fresh") requestImport(slug);
            router.push("/admin");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function PermanentLink({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is on screen to copy by hand.
    }
  };
  return (
    <p className="flex min-w-0 items-center gap-2 text-sm text-gray-600">
      <span className="flex-shrink-0">
        Bio link<span className="hidden sm:inline">, always the next event</span>:
      </span>
      <span className="truncate font-semibold text-deep-navy">{href.replace(/^https?:\/\//, "")}</span>
      <button type="button" onClick={copy} className="min-h-11 flex-shrink-0 rounded-md px-2 text-sm font-semibold text-deep-navy underline underline-offset-2 hover:bg-white">
        {copied ? "Copied ✓" : "Copy"}
      </button>
      <span role="status" className="sr-only">{copied ? "Link copied" : ""}</span>
    </p>
  );
}

function EventRow({
  funnel,
  current,
  status,
  onOpen,
  onDuplicate,
}: {
  funnel: Funnel;
  current: boolean;
  status?: ReturnType<typeof standing>;
  onOpen: () => void;
  onDuplicate?: () => void;
}) {
  const poster = thumbnailOf(sceneMediaOf(funnel));
  const title = funnel.cover.hero?.title ?? funnel.brand.seriesLabel;
  const when = status?.next ?? status?.last;
  return (
    <li className="flex items-center gap-3 px-3 py-3 sm:px-4">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-teal-accent" aria-label={`Open ${title}`}>
        <span className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-md bg-deep-navy" style={funnel.brand.theme as React.CSSProperties}>
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element -- organizer media from anywhere
            <img src={poster} alt="" className="h-full w-full object-cover object-top" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white/80" aria-hidden="true">
              {funnel.brand.name[0]}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 font-bold leading-snug text-deep-navy">{title}</span>
          <span className="mt-0.5 block truncate text-sm text-gray-600">
            {when ? <LocalDate iso={when.startsAt} /> : `/f/${funnel.slug}`}
          </span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            {status && <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>}
            {current && <span className="rounded-md bg-deep-navy px-2 py-0.5 text-xs font-semibold text-white">Editing</span>}
          </span>
        </span>
      </button>
      {onDuplicate && (
        <button type="button" onClick={onDuplicate} className="min-h-11 flex-shrink-0 rounded-md px-3 text-sm font-semibold text-deep-navy hover:bg-soft-gray" aria-label={`Duplicate ${title}`}>
          Duplicate
        </button>
      )}
    </li>
  );
}

const field =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-charcoal focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-accent";

/** New event (fresh, from an organizer) or Duplicate (copy of one event): a name and a link. */
function NewEventSheet({
  mode,
  source,
  events,
  onClose,
  onCreated,
}: {
  mode: NewEventMode;
  source?: AdminEvent;
  events: AdminEvent[];
  onClose: () => void;
  onCreated: (slug: string, mode: NewEventMode) => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const organizers = [...new Map(events.map((e) => [e.organizer.slug, e.organizer])).values()];
  const [organizer, setOrganizer] = useState(source?.organizer.slug ?? organizers[0]?.slug ?? "");
  const [name, setName] = useState(source?.live.brand.seriesLabel ?? "");
  const [slug, setSlug] = useState(() => (source ? freeSlug(source.funnel.slug, events) : ""));
  const [slugEdited, setSlugEdited] = useState(Boolean(source));
  const [busy, setBusy] = useState(false);
  // An error belongs to the field it's about; anything else shows under the card.
  const [error, setError] = useState<{ field: "name" | "slug" | "form"; text: string } | null>(null);
  useEffect(() => ref.current?.showModal(), []);

  // A fresh event starts from the organizer's latest event (their look and name).
  const from =
    source ??
    events
      .filter((e) => e.organizer.slug === organizer)
      .sort((a, b) => lastStart(b.live) - lastStart(a.live))[0];
  const org = organizers.find((o) => o.slug === organizer);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError({ field: "name", text: "Give the event a name." });
    if (!EVENT_SLUG.test(slug)) return setError({ field: "slug", text: "Use lowercase letters, numbers and dashes for the link." });
    if (!from) return setError({ field: "form", text: "Choose an organizer." });
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: from.funnel.slug, name: name.trim(), slug, mode }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { slug?: string; error?: string } | undefined;
    if (res?.ok && body?.slug) return onCreated(body.slug, mode);
    setBusy(false);
    setError({
      field: res?.status === 409 ? "slug" : "form",
      text: !res ? "Couldn't reach the server. Check your connection and try again." : res.status === 401 ? "Your sign-in expired. Sign in again, then try." : body?.error ?? "Couldn't add the event. Try again.",
    });
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
      className="m-auto max-h-[92dvh] w-[min(30rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-soft-gray p-0 text-charcoal shadow-2xl backdrop:bg-deep-navy/60"
    >
      <form onSubmit={submit} noValidate>
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
          <div>
            <h2 id={`${id}-title`} className="text-xl font-bold text-deep-navy">{mode === "copy" ? "Duplicate event" : "New event"}</h2>
            <p className="mt-0.5 text-sm text-gray-600">
              {mode === "copy"
                ? `Copies ${source?.live.brand.seriesLabel}'s reels, look and words as published. Dates start empty.`
                : "Starts with your logo and colors. Next, import the flyer to fill in the dates, look and reels."}
            </p>
          </div>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="-mr-2 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-white hover:text-deep-navy">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4 px-5 pb-5">
          <div className="divide-y divide-gray-100 rounded-xl bg-white">
            {mode === "fresh" && organizers.length > 1 && (
              <div className="px-4 py-3">
                <label htmlFor={`${id}-org`} className="text-sm font-semibold text-deep-navy">Organizer</label>
                <select id={`${id}-org`} className={field} value={organizer} onChange={(e) => setOrganizer(e.target.value)}>
                  {organizers.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
                </select>
              </div>
            )}
            <div className="px-4 py-3">
              <label htmlFor={`${id}-name`} className="text-sm font-semibold text-deep-navy">Event name</label>
              <input
                id={`${id}-name`}
                className={field}
                maxLength={80}
                autoFocus
                onFocus={(e) => mode === "copy" && e.target.select()}
                aria-invalid={error?.field === "name"}
                aria-describedby={error?.field === "name" ? `${id}-name-error` : undefined}
                placeholder="New Year's Masquerade"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error?.field === "name") setError(null);
                  if (!slugEdited) setSlug(slugFromName(e.target.value));
                }}
              />
              {error?.field === "name" && <p id={`${id}-name-error`} role="alert" className="mt-1.5 text-sm font-semibold text-red-700">{error.text}</p>}
            </div>
            <div className="px-4 py-3">
              <label htmlFor={`${id}-slug`} className="text-sm font-semibold text-deep-navy">Link</label>
              <div className="mt-1 flex items-center rounded-lg border border-gray-300 bg-white focus-within:border-transparent focus-within:ring-2 focus-within:ring-teal-accent">
                <span className="pl-3 text-base text-gray-600">/f/</span>
                <input
                  id={`${id}-slug`}
                  className="min-w-0 flex-1 rounded-lg bg-transparent py-2.5 pr-3 text-base text-charcoal focus:outline-none"
                  maxLength={64}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={error?.field === "slug"}
                  aria-describedby={`${id}-slug-help`}
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    if (error?.field === "slug") setError(null);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                  }}
                />
              </div>
              {error?.field === "slug" && <p role="alert" className="mt-1.5 text-sm font-semibold text-red-700">{error.text}</p>}
              <p id={`${id}-slug-help`} className="mt-1.5 text-xs text-gray-600">
                This event&apos;s own link, for ads and flyers.{org ? ` Your bio link, /f/${org.slug}, stays the same.` : ""}
              </p>
            </div>
          </div>
          {error?.field === "form" && <p role="alert" className="px-1 text-sm font-semibold text-red-700">{error.text}</p>}
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-gray-200 bg-soft-gray/95 px-5 py-3 backdrop-blur">
          <button type="button" onClick={() => ref.current?.close()} className="ml-auto min-h-11 rounded-lg px-4 text-sm font-semibold text-deep-navy hover:bg-white">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-deep-navy px-6 text-sm font-bold text-white hover:bg-royal-blue disabled:cursor-wait disabled:opacity-70"
          >
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true" />}
            {busy ? "Creating…" : mode === "copy" ? "Duplicate" : "Create event"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** The first "<slug>-N" no listed event uses (the server checks every link again). */
function freeSlug(base: string, events: AdminEvent[]) {
  const taken = new Set(events.map((e) => e.funnel.slug));
  const stem = base.replace(/-\d+$/, "");
  for (let n = 2; ; n++) if (!taken.has(`${stem}-${n}`)) return `${stem}-${n}`.slice(0, 64);
}

const lastStart = (f: Funnel) => Math.max(0, ...(f.events ?? []).map((e) => Date.parse(e.startsAt)));
