"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CinematicHero from "@/components/CinematicHero";
import ReelViewer from "@/components/ReelViewer";
import { isConcept } from "@/config/site";
import type { Funnel, FunnelEvent } from "@/data/funnel-types";
import { applyPublication, type Publication } from "@/lib/publication";
import { funnelReel } from "@/data/reels";
import FunnelLeadSheet from "@/components/FunnelLeadSheet";
import FollowSheet from "@/components/follow/FollowSheet";
import { followLabel, useFollowTarget, useIsFollowing } from "@/components/follow/follow";
import SourceLink from "@/components/SourceLink";
import { eventChip, formatEventDate, isOver, lastDate, nextOnSale, openingReel, ticketHref, upcomingEvents, type NextNight } from "@/lib/events";
import { eventDate, eventDayOfMonth, eventTime, type EventClock } from "@/lib/event-time";
import { DEFAULT_EFFECT } from "@/lib/look";
import { getSourceTag, trackReelEvent } from "@/lib/reel-tracking";


const HOUR = 60 * 60 * 1000;
const PRIMARY =
  "cine-cta flex min-h-14 items-center justify-center whitespace-nowrap rounded-full bg-teal-accent text-[17px] font-semibold text-on-accent shadow-lg shadow-black/40 transition hover:brightness-110 max-[380px]:text-base";
const GLASS =
  "flex min-h-14 items-center justify-center whitespace-nowrap rounded-full border border-white/25 bg-white/10 font-semibold text-white backdrop-blur-md transition hover:bg-white/20";

/** The current time, ticking every 30 seconds while `on`. */
function useClock(on: boolean, start: number) {
  const [time, setTime] = useState(start);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setTime(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [on]);
  return time;
}

/** The line above the title when there's one date: a countdown on the day, else a hook. */
function singleHook(event: FunnelEvent, untilStart: number) {
  if (untilStart <= 0) return "Happening now";
  if (untilStart < 12 * HOUR) {
    const h = Math.floor(untilStart / HOUR);
    const m = Math.floor((untilStart % HOUR) / 60_000);
    return `Starts in ${h ? `${h}h ` : ""}${m}m`;
  }
  if (untilStart < 6.5 * 24 * HOUR) {
    return `This ${eventDate(event, { weekday: "long" })}`;
  }
  return "One night only";
}

/**
 * The shareable funnel link. It opens on a "What happened?" screen; each
 * choice starts the reels at that topic. ?start=<reel id> skips straight to
 * a reel, which is how follow-up texts send someone their next video.
 */
export default function FunnelExperience({
  funnel: base,
  publication,
  startReelId,
  startEnded = false,
  onMoment,
  nextNight,
}: {
  /** The funnel as built (from code or the database), before published edits. */
  funnel: Funnel;
  publication: Publication | null;
  /** Opens straight into this reel, like ?start= (the admin preview uses it). */
  startReelId?: string;
  /** With startReelId: opens on the end card that follows it. */
  startEnded?: boolean;
  /** Told what's on screen: the opening (no reel), a reel, or the end card. */
  onMoment?: (moment: { reelId: string | null; ended: boolean }) => void;
  /** The organizer's next night on another link, for when this one is over. */
  nextNight?: NextNight;
}) {
  const funnel = useMemo(() => applyPublication(base, publication), [base, publication]);
  const { brand } = funnel;
  // The main button's effect (only the PRIMARY button shows it).
  const effect = brand.buttonEffect ?? DEFAULT_EFFECT;
  const fx = { "data-fx": effect.style, "data-fx-strength": effect.strength };
  const params = useSearchParams();
  const start = startReelId ?? params.get("start");
  // Each visit gets a new key, so the viewer starts a fresh path every time.
  const [visit, setVisit] = useState<{ reelId: string; key: number } | null>(
    () => (start && funnelReel(funnel, start) ? { reelId: start, key: 0 } : null)
  );

  // The opening screen is on show whenever no reel is.
  useEffect(() => {
    if (!visit) onMoment?.({ reelId: null, ended: false });
  }, [visit, onMoment]);

  const entries = funnel.entryReelIds.filter((id) => funnelReel(funnel, id));
  // Event funnels list their upcoming dates instead of fixed topics. This
  // component only renders in the browser, so "now" is the viewer's clock.
  const [now] = useState(() => Date.now());
  const isEvents = Boolean(funnel.events?.length);
  const reelFor = (eventId: string) => {
    const event = funnel.events?.find((e) => e.id === eventId);
    return (event && openingReel(funnel, event)?.id) ?? entries[0];
  };
  const upcoming = isEvents ? upcomingEvents(funnel, now) : [];
  const recap = isEvents
    ? funnel.reels.find((r) => {
        const ev = funnel.events!.find((e) => e.id === r.eventId);
        return ev && isOver(ev, now);
      })
    : undefined;
  const onSale = isEvents ? nextOnSale(funnel, now) : undefined;
  // After the night: every date is over. The link thanks people, plays the
  // recap, and sends them to the organizer's next night (or takes their
  // number for it) instead of selling tickets that are gone.
  const over = isEvents && upcoming.length === 0;
  const lastNight = over ? lastDate(funnel) : undefined;
  // The page can be a few minutes old: only a night that's still to come.
  const next = over && nextNight && !isOver(nextNight, now) ? nextNight : undefined;
  const nextWhen = next && formatEventDate(next);
  const [updates, setUpdates] = useState(false);
  // Where the organizer has Follow on, it takes Updates' place.
  const follow = useFollowTarget();
  const isFollowing = useIsFollowing(follow?.organizer);
  // Its words were about getting tickets; now they're about the night that was.
  const afterLine = next ? "Relive the night, then see what's next." : "Relive the night.";
  const coverFunnel = over
    ? { ...funnel, cover: { ...funnel.cover, intro: afterLine, ...(funnel.cover.hero ? { hero: { ...funnel.cover.hero, tagline: afterLine } } : {}) } }
    : funnel;
  const hero = funnel.cover.hero;
  // One upcoming date: a single event card instead of a row of one circle.
  const single = hero && isEvents && upcoming.length === 1 ? upcoming[0] : undefined;
  // Ticks every 30 seconds, for the countdown on the day.
  const clock = useClock(Boolean(single), now);
  const untilStart = single ? Date.parse(single.startsAt) - clock : Infinity;
  // Close to the date on sale, or nearly gone: selling the ticket comes first,
  // with one date or several.
  const untilOnSale = onSale ? Date.parse(onSale.startsAt) - clock : Infinity;
  const ticketsFirst = Boolean(onSale && (!single || onSale.id === single.id) && (untilOnSale < 48 * HOUR || onSale.status === "few_left"));

  // The scene names the next date on sale, with a live dot. With one date,
  // the card carries the details, so this is just the hook (or a countdown).
  let eyebrow: React.ReactNode = brand.seriesLabel;
  if (lastNight) {
    eyebrow = `Thanks for coming \u00b7 ${formatEventDate(lastNight)}`;
  } else if (single) {
    eyebrow = (
      <span className="inline-flex items-center gap-2">
        <span className="cine-live h-1.5 w-1.5 rounded-full bg-sky-accent" />
        {singleHook(single, untilStart)}
      </span>
    );
  } else if (onSale) {
    const chip = eventChip(onSale, now);
    const date = formatEventDate(onSale);
    const when = chip.text.startsWith(date) ? chip.text : `${date} \u00b7 ${chip.text}`;
    eyebrow = (
      <span className="inline-flex items-center gap-2">
        <span className="cine-live h-1.5 w-1.5 rounded-full bg-sky-accent" />
        Next up &middot; {when}
      </span>
    );
  }

  const startAt = (reelId: string) => setVisit((v) => ({ reelId, key: (v?.key ?? 0) + 1 }));

  const peekReel = onSale ? reelFor(onSale.id) : entries[0];

  // A full opening scene is the whole first screen: the dates as story
  // circles, one main button into the reels, tickets beside it, fine print.
  const recapReel = recap?.id ?? entries[0];
  // After the night: the recap first, then the next night or Updates.
  const afterActions = (
    <>
      <div className="flex gap-2.5">
        <button type="button" onClick={() => startAt(recapReel)} className={`${PRIMARY} flex-1 gap-2.5 px-4`} {...fx}>
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l14 8-14 8V4z" /></svg>
          Watch the recap
        </button>
        {next ? (
          <SourceLink href={`/f/${next.slug}`} aria-label={`Next: ${next.name}, ${nextWhen}`} className={`${GLASS} px-5 max-[380px]:px-4`}>
            Next &middot; {shortDay(next)}
          </SourceLink>
        ) : (
          <button type="button" onClick={() => setUpdates(true)} className={`${GLASS} px-5 max-[380px]:px-4`}>
            {follow ? followLabel(isFollowing) : (brand.copy.textLaterButton ?? "Updates")}
          </button>
        )}
      </div>
      <p className="mt-2.5 text-center text-xs font-medium text-white/75">
        {next ? `Next up: ${next.name} \u00b7 ${nextWhen}` : "Hear about the next night first."}
      </p>
      <p className="mt-2 text-center text-[11px] leading-snug text-white/60">{brand.footer}</p>
    </>
  );

  const actions = over && hero ? afterActions : hero && (
    <>
      {single ? (
        <SingleDate
          event={single}
          now={now}
          calendarHref={`/f/${funnel.slug}/calendar/${encodeURIComponent(single.id)}`}
          onOpen={() => startAt(reelFor(single.id))}
          onRecap={recap ? () => startAt(recap.id) : undefined}
        />
      ) : (
        <>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">{funnel.cover.heading}</h2>
        <ul className="-mx-5 mt-2.5 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="list">
          {isEvents
            ? [
                // Dates you can buy first; sold-out ones after them, dimmed, for the waitlist.
                ...[...upcoming.filter((e) => e.status !== "sold_out"), ...upcoming.filter((e) => e.status === "sold_out")].map((event) => {
                  const chip = eventChip(event, now);
                  const soldOut = event.status === "sold_out";
                  const status = soldOut ? "Sold out" : event.status === "few_left" ? "Few left" : chip.text;
                  // "Golden Hour: Late Night" -> "Late Night"
                  const variant = event.name.includes(": ") ? event.name.split(": ").slice(1).join(": ") : undefined;
                  // Far-off dates use the date itself as the chip; say it once.
                  const date = formatEventDate(event);
                  const when = chip.text.startsWith(date) ? chip.text : `${date}, ${chip.text}`;
                  return (
                    <StoryCircle
                      key={event.id}
                      label={`${event.name}, ${when}${event.price && !soldOut ? `, ${event.price}` : ""}${soldOut ? ", join the waitlist" : ""}`}
                      date={event}
                      line1={status}
                      line2={variant ?? (soldOut ? "Waitlist" : undefined)}
                      hot={chip.tone === "hot"}
                      dim={soldOut}
                      onClick={() => startAt(reelFor(event.id))}
                    />
                  );
                }),
                recap && (
                  <StoryCircle
                    key="recap"
                    label="Watch last time"
                    line1="Last time"
                    line2="Recap"
                    dim
                    onClick={() => startAt(recap.id)}
                  />
                ),
              ]
            : entries.map((id) => (
                <StoryCircle
                  key={id}
                  label={funnel.cover.entryLabels[id] ?? funnelReel(funnel, id)!.practiceArea}
                  line1={funnel.cover.entryLabels[id] ?? funnelReel(funnel, id)!.practiceArea}
                  onClick={() => startAt(id)}
                />
              ))}
        </ul>
        </>
      )}
      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={() => startAt(peekReel)}
          {...fx}
          className={
            ticketsFirst
              ? `${GLASS} order-2 gap-2 px-5 max-[380px]:px-4`
              : `${PRIMARY} flex-1 gap-2.5 px-4`
          }
        >
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l14 8-14 8V4z" /></svg>
          {/* Shorter when it's the second button, so both fit on small phones. */}
          {ticketsFirst ? "Watch" : hero.watchLabel ?? "Watch"}
        </button>
        {onSale ? (
          <a
            href={ticketHref(funnel, onSale, { sourceTag: getSourceTag() })}
            target="_blank"
            rel="noopener"
            onClick={() => trackReelEvent(funnel, reelFor(onSale.id), "cta_clicked")}
            {...fx}
            aria-label={`${brand.copy.ticketsPrimary ?? "Get tickets"}: ${onSale.name}, ${formatEventDate(onSale)}, ${eventTime(onSale)}${onSale.price ? `, ${onSale.price}` : ""}`}
            className={ticketsFirst ? `${PRIMARY} order-1 flex-1 px-4` : `${GLASS} px-5 max-[380px]:px-4`}
          >
            {/* With several dates, the button says which one it sells. */}
            {single
              ? brand.copy.ticketsPrimary ?? "Get tickets"
              : ticketsFirst
                ? `Tickets \u00b7 ${formatEventDate(onSale)}`
                : `Tickets \u00b7 ${shortDay(onSale)}`}
          </a>
        ) : (
          brand.phone && (
            <a
              href={brand.phone.href}
              onClick={() => trackReelEvent(funnel, entries[0], "call_clicked")}
              className="flex min-h-14 items-center rounded-full border border-white/25 bg-white/10 px-5 font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              {brand.copy.callNow}
            </a>
          )
        )}
      </div>
      {/* What the tickets button buys, before anyone taps it. */}
      {onSale && !single && (
        <p className="mt-2.5 text-center text-xs font-medium text-white/75">
          {[onSale.name.includes(": ") ? onSale.name.split(": ").slice(1).join(": ") : undefined, `${formatEventDate(onSale)}, ${eventTime(onSale)}`, onSale.price, brand.ageLimit]
            .filter(Boolean)
            .join(" \u00b7 ")}
        </p>
      )}
      <p aria-hidden="true" className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-white/60 pointer-fine:hidden">
        <svg className="cine-bob h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg>
        Swipe up to step inside
      </p>
      <p className="mt-2 text-center text-[11px] leading-snug text-white/60">{brand.footer}</p>
    </>
  );

  return (
    <FunnelShell funnel={funnel}>
      <FunnelCover
        funnel={coverFunnel}
        revealed
        eyebrow={eyebrow}
        actions={actions}
        paused={Boolean(visit)}
        onSwipeUp={hero && !visit ? () => startAt(over ? recapReel : peekReel) : undefined}
      >
        {!hero && (<>
        <ul className="mt-1 grid gap-2" role="list">
          {isEvents
            ? upcoming.map((event) => {
                const chip = eventChip(event, now);
                // Far-off dates use the date itself as the chip; don't repeat it.
                const date = formatEventDate(event);
                const extra = chip.text.startsWith(date) ? chip.text.slice(date.length).replace(/^ \u00b7 /, "") : chip.text;
                return (
                  <li key={event.id}>
                    <ChoiceButton onClick={() => setVisit({ reelId: reelFor(event.id), key: Date.now() })}>
                      <span className="min-w-0">
                        <span className="block truncate">{event.name}</span>
                        <span className="mt-0.5 block text-xs font-medium text-gray-300">
                          {date}
                          {event.price ? ` \u00b7 ${event.price}` : ""}
                          {extra && (
                            <>
                              {" \u00b7 "}
                              <span className={chip.tone === "hot" ? "font-semibold text-sky-accent" : ""}>{extra}</span>
                            </>
                          )}
                        </span>
                      </span>
                    </ChoiceButton>
                  </li>
                );
              })
            : entries.map((id) => (
                <li key={id}>
                  <ChoiceButton onClick={() => setVisit({ reelId: id, key: Date.now() })}>
                    {funnel.cover.entryLabels[id] ?? funnelReel(funnel, id)!.practiceArea}
                  </ChoiceButton>
                </li>
              ))}
          {recap && (
            <li>
              <button
                type="button"
                onClick={() => setVisit({ reelId: recap.id, key: Date.now() })}
                className="mt-1 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-gray-200 hover:bg-white/5"
              >
                <svg className="h-4 w-4 text-sky-accent" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l14 8-14 8V4z" /></svg>
                Watch last time
              </button>
            </li>
          )}
        </ul>
        {isEvents ? (
          onSale && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="text-sm text-gray-300">{brand.copy.coverCallPrompt}</p>
              <a
                href={ticketHref(funnel, onSale, { sourceTag: getSourceTag() })}
                target="_blank"
                rel="noopener"
                onClick={() => trackReelEvent(funnel, reelFor(onSale.id), "cta_clicked")}
                className="mt-2 flex min-h-12 w-full items-center justify-center rounded-md bg-teal-accent px-5 font-semibold text-on-accent shadow-md hover:brightness-110"
              >
                {brand.copy.coverCall}
              </a>
            </div>
          )
        ) : (
          brand.phone && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="text-sm text-gray-300">{brand.copy.coverCallPrompt}</p>
              <a
                href={brand.phone.href}
                onClick={() => trackReelEvent(funnel, entries[0], "call_clicked")}
                className="mt-2 flex min-h-12 w-full items-center justify-center rounded-md bg-teal-accent px-5 font-semibold text-on-accent shadow-md hover:brightness-110"
              >
                {brand.copy.coverCall}
              </a>
            </div>
          )
        )}
        </>)}
      </FunnelCover>

      {visit && (
        <ReelViewer
          key={visit.key}
          variant="page"
          funnel={funnel}
          startReelId={visit.reelId}
          startEnded={startEnded && visit.key === 0}
          onMoment={onMoment}
          onClose={() => setVisit(null)}
          after={over ? { next } : undefined}
        />
      )}
      {updates && follow && <FollowSheet target={follow} onClose={() => setUpdates(false)} />}
      {updates && !follow && funnelReel(funnel, recapReel) && (
        <FunnelLeadSheet
          funnel={funnel}
          intent="text_later"
          reel={funnelReel(funnel, recapReel)!}
          copy={{
            heading: "Hear about the next night",
            intro: "We'll text you when the next one is announced, before anyone else.",
            submit: brand.copy.textLater.submit,
          }}
          onClose={() => setUpdates(false)}
        />
      )}
    </FunnelShell>
  );
}

function ChoiceButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-left font-semibold transition-colors hover:border-sky-accent hover:bg-white/10"
    >
      {children}
      <svg className="h-5 w-5 flex-shrink-0 text-sky-accent" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4l14 8-14 8V4z" />
      </svg>
    </button>
  );
}

/** Shown while the page loads, before the topic choices can be used. */
export function FunnelSplash({ funnel: base, publication }: { funnel: Funnel; publication: Publication | null }) {
  const funnel = applyPublication(base, publication);
  return (
    <FunnelShell funnel={funnel}>
      <FunnelCover funnel={funnel} revealed={false} />
    </FunnelShell>
  );
}

// Applies the funnel's colors to everything inside it, the reel viewer included.
function FunnelShell({ funnel, children }: { funnel: Funnel; children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="min-h-dvh bg-deep-navy [color-scheme:dark] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-white"
      style={funnel.brand.theme as React.CSSProperties}
    >
      {children}
    </main>
  );
}

function FunnelCover({
  funnel,
  children,
  ...scene
}: {
  funnel: Funnel;
  children?: React.ReactNode;
  revealed: boolean;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  paused?: boolean;
  onSwipeUp?: () => void;
}) {
  const { brand } = funnel;
  // A sample business is always labeled; any other funnel that isn't live is labeled in demo mode.
  const notice =
    funnel.sample?.notice ??
    (isConcept(funnel)
      ? `Preview of ${brand.name}'s link. Not live yet.`
      : undefined);
  const noticeBar = notice && (
    <p className="bg-black/40 px-4 py-1.5 text-center text-[11px] leading-snug text-gray-200">{notice}</p>
  );
  // A full scene is the whole first screen, fine print included.
  if (funnel.cover.hero) {
    return (
      <div className="cine-screen flex flex-col">
        {noticeBar}
        <CinematicHero funnel={funnel} {...scene} />
      </div>
    );
  }
  return (
    <>
      {noticeBar}
      <CinematicHero funnel={funnel} {...scene} />
      <div className="mx-auto flex max-w-md flex-col px-5 pb-10">
        {children}
        <p className="mt-8 text-[11px] leading-snug text-gray-400">{brand.footer}</p>
      </div>
    </>
  );
}

/** A date (or topic) as an Instagram-style story circle: tap to watch its reels. */
function StoryCircle({
  label,
  date,
  line1,
  line2,
  hot = false,
  dim = false,
  onClick,
}: {
  label: string;
  /** The date it shows, on the event's own clock. */
  date?: EventClock;
  line1: string;
  line2?: string;
  hot?: boolean;
  dim?: boolean;
  onClick: () => void;
}) {
  return (
    <li className="shrink-0">
      <button type="button" onClick={onClick} aria-label={label} className="group flex w-[76px] flex-col items-center gap-1.5 rounded-xl py-1">
        <span
          className={`rounded-full p-[2.5px] transition group-hover:scale-105 ${
            dim ? "bg-white/30" : "bg-[conic-gradient(from_200deg,var(--sky-accent),var(--teal-accent),var(--sky-accent))]"
          }`}
        >
          <span className="block rounded-full bg-deep-navy p-[2.5px]">
            <span className="flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full bg-white/10 leading-none backdrop-blur-md">
              {date ? (
                <>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-accent">
                    {eventDate(date, { month: "short" })}
                  </span>
                  <span className="mt-0.5 text-xl font-bold text-white">{eventDayOfMonth(date)}</span>
                </>
              ) : (
                <svg className="ml-0.5 h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l14 8-14 8V4z" /></svg>
              )}
            </span>
          </span>
        </span>
        <span className={`w-full truncate text-center text-[11px] leading-tight ${hot ? "font-semibold text-sky-accent" : dim ? "text-white/55" : "text-white/85"}`}>
          {line1}
        </span>
        {line2 && <span className="-mt-1 w-full truncate text-center text-[11px] leading-tight text-white/60">{line2}</span>}
      </button>
    </li>
  );
}

/** "Oct 4": a short date for a button that has to share a row, on the event's clock. */
const shortDay = (e: EventClock) => eventDate(e, { month: "short", day: "numeric" });

/**
 * The one upcoming date, as a card: when, where and how much, with its
 * status. Tapping it plays the date's reel. Below it: Add to calendar, and
 * last time's recap.
 */
function SingleDate({
  event,
  now,
  calendarHref,
  onOpen,
  onRecap,
}: {
  event: FunnelEvent;
  now: number;
  calendarHref: string;
  onOpen: () => void;
  onRecap?: () => void;
}) {
  const chip = eventChip(event, now);
  const soldOut = event.status === "sold_out";
  const status = soldOut ? "Sold out" : event.status === "few_left" ? "Few left" : chip.text.split(" \u00b7 ")[0];
  const where = [event.venue, event.price].filter(Boolean).join(" \u00b7 ");
  return (
    <div>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${event.name}, ${formatEventDate(event)}${where ? `, ${where}` : ""}, ${status}. Watch`}
        className="flex w-full items-center gap-3 rounded-2xl bg-white/10 p-3 text-left ring-1 ring-white/15 backdrop-blur-md transition hover:bg-white/15"
      >
        <span className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-black/30 leading-none">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-accent">
            {eventDate(event, { month: "short" })}
          </span>
          <span className="mt-1 text-xl font-bold text-white">{eventDayOfMonth(event)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-white">
            {eventDate(event, { weekday: "long" })} &middot; {eventTime(event)}
          </span>
          {where && <span className="mt-0.5 block truncate text-[13px] text-white/75">{where}</span>}
        </span>
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            soldOut ? "bg-white/10 text-white/70" : chip.tone === "hot" ? "bg-sky-accent text-deep-navy" : "bg-white/15 text-white"
          }`}
        >
          {status}
        </span>
      </button>
      <div className="mt-2 flex items-center justify-between px-1 text-[13px] font-medium">
        <a href={calendarHref} download className="flex min-h-9 items-center gap-1.5 text-white/80 hover:text-white">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M12 14v4M10 16h4" />
          </svg>
          Add to calendar
        </a>
        {onRecap && (
          <button type="button" onClick={onRecap} className="flex min-h-9 items-center gap-1.5 text-white/80 hover:text-white">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l14 8-14 8V4z" /></svg>
            Watch last time
          </button>
        )}
      </div>
    </div>
  );
}
