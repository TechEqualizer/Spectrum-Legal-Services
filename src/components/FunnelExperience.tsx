"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import CinematicHero from "@/components/CinematicHero";
import ReelViewer from "@/components/ReelViewer";
import { site } from "@/config/site";
import type { Funnel } from "@/data/funnel-types";
import { getFunnelBySlug } from "@/data/funnels";
import { funnelReel } from "@/data/reels";
import { eventChip, formatEventDate, isOver, nextOnSale, ticketHref, upcomingEvents } from "@/lib/events";
import { getSourceTag, trackReelEvent } from "@/lib/reel-tracking";


/**
 * The shareable funnel link. It opens on a "What happened?" screen; each
 * choice starts the reels at that topic. ?start=<reel id> skips straight to
 * a reel, which is how follow-up texts send someone their next video.
 */
export default function FunnelExperience({ slug }: { slug: string }) {
  const funnel = getFunnelBySlug(slug)!;
  const { brand } = funnel;
  const params = useSearchParams();
  const start = params.get("start");
  // Each visit gets a new key, so the viewer starts a fresh path every time.
  const [visit, setVisit] = useState<{ reelId: string; key: number } | null>(
    () => (start && funnelReel(funnel, start) ? { reelId: start, key: 0 } : null)
  );

  const entries = funnel.entryReelIds.filter((id) => funnelReel(funnel, id));
  // Event funnels list their upcoming dates instead of fixed topics. This
  // component only renders in the browser, so "now" is the viewer's clock.
  const [now] = useState(() => Date.now());
  const isEvents = Boolean(funnel.events?.length);
  const reelFor = (eventId: string) => funnel.reels.find((r) => r.eventId === eventId)?.id ?? entries[0];
  const upcoming = isEvents ? upcomingEvents(funnel, now) : [];
  const recap = isEvents
    ? funnel.reels.find((r) => {
        const ev = funnel.events!.find((e) => e.id === r.eventId);
        return ev && isOver(ev, now);
      })
    : undefined;
  const onSale = isEvents ? nextOnSale(funnel, now) : undefined;
  const hero = funnel.cover.hero;

  // The scene names the next date on sale, with a live dot.
  let eyebrow: React.ReactNode = brand.seriesLabel;
  if (onSale) {
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
  const actions = hero && (
    <>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">{funnel.cover.heading}</h2>
      <ul className="-mx-5 mt-2.5 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="list">
        {isEvents
          ? [
              ...upcoming.map((event) => {
                const chip = eventChip(event, now);
                const soldOut = event.status === "sold_out";
                const status = soldOut ? "Sold out" : event.status === "few_left" ? "Few left" : chip.text;
                // "Golden Hour: Late Night" -> "Late Night"
                const variant = event.name.includes(": ") ? event.name.split(": ").slice(1).join(": ") : undefined;
                return (
                  <StoryCircle
                    key={event.id}
                    label={`${event.name}, ${formatEventDate(event)}, ${chip.text}`}
                    date={new Date(event.startsAt)}
                    line1={status}
                    line2={variant}
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
      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={() => startAt(peekReel)}
          className="cine-shimmer flex min-h-14 flex-1 items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-teal-accent px-4 text-[17px] max-[380px]:text-base font-semibold text-white shadow-lg shadow-black/40 transition hover:brightness-110"
        >
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l14 8-14 8V4z" /></svg>
          {hero.watchLabel ?? "Watch"}
        </button>
        {onSale ? (
          <a
            href={ticketHref(funnel, onSale, { sourceTag: getSourceTag() })}
            target="_blank"
            rel="noopener"
            onClick={() => trackReelEvent(funnel, reelFor(onSale.id), "cta_clicked")}
            className="flex min-h-14 items-center whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-5 font-semibold text-white backdrop-blur-md transition hover:bg-white/20 max-[380px]:px-4"
          >
            {brand.copy.ticketsPrimary ?? "Get tickets"}
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
      <p aria-hidden="true" className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-white/60 pointer-fine:hidden">
        <svg className="cine-bob h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg>
        Swipe up to step inside
      </p>
      <p className="mt-2.5 text-center text-[10px] leading-snug text-white/45">{brand.footer}</p>
    </>
  );

  return (
    <FunnelShell funnel={funnel}>
      <FunnelCover
        funnel={funnel}
        revealed
        eyebrow={eyebrow}
        actions={actions}
        paused={Boolean(visit)}
        onSwipeUp={hero && !visit ? () => startAt(peekReel) : undefined}
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
                className="mt-2 flex min-h-12 w-full items-center justify-center rounded-md bg-teal-accent px-5 font-semibold text-white shadow-md hover:brightness-110"
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
                className="mt-2 flex min-h-12 w-full items-center justify-center rounded-md bg-teal-accent px-5 font-semibold text-white shadow-md hover:brightness-110"
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
          onClose={() => setVisit(null)}
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
export function FunnelSplash({ slug }: { slug: string }) {
  const funnel = getFunnelBySlug(slug)!;
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
  // A sample business is always labeled; the JLF concept is labeled in demo mode.
  const notice =
    funnel.sample?.notice ??
    (site.demoMode
      ? `Concept preview prepared for ${brand.name}. Not the firm's official link.`
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
  date?: Date;
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
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-accent">
                    {date.toLocaleDateString("en-US", { month: "short" })}
                  </span>
                  <span className="mt-0.5 text-xl font-bold text-white">{date.getDate()}</span>
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
        {line2 && <span className="-mt-1 w-full truncate text-center text-[10px] leading-tight text-white/55">{line2}</span>}
      </button>
    </li>
  );
}
