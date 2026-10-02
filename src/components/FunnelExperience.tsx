"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import BrandLogo from "@/components/BrandLogo";
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

  return (
    <FunnelShell funnel={funnel}>
      <FunnelCover funnel={funnel}>
        <div className="mt-8">
          <h1 className="text-3xl font-black uppercase tracking-tight text-white">
            {funnel.cover.heading}
          </h1>
          <p className="mt-2 text-gray-200">{funnel.cover.intro}</p>
        </div>
        <ul className="mt-6 grid gap-2" role="list">
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
      <FunnelCover funnel={funnel} />
    </FunnelShell>
  );
}

// Applies the funnel's colors to everything inside it, the reel viewer included.
function FunnelShell({ funnel, children }: { funnel: Funnel; children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="min-h-dvh bg-deep-navy pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-white"
      style={funnel.brand.theme as React.CSSProperties}
    >
      {children}
    </main>
  );
}

function FunnelCover({ funnel, children }: { funnel: Funnel; children?: React.ReactNode }) {
  const { brand } = funnel;
  // A sample business is always labeled; the JLF concept is labeled in demo mode.
  const notice =
    funnel.sample?.notice ??
    (site.demoMode
      ? `Concept preview prepared for ${brand.name}. Not the firm's official link.`
      : undefined);
  return (
    <>
      {notice && (
        <p className="bg-black/40 px-4 py-1.5 text-center text-[11px] leading-snug text-gray-200">
          {notice}
        </p>
      )}
      <div className="mx-auto flex max-w-md flex-col px-5 pb-10 pt-6">
        <div className="flex items-center justify-between gap-4">
          <BrandLogo brand={brand} eager />
          {brand.byline && (
            <p className="text-right text-xs leading-snug text-gray-300">
              {brand.byline[0]}
              <br />
              {brand.byline[1]}
            </p>
          )}
        </div>
        {children}
        <p className="mt-8 text-[11px] leading-snug text-gray-400">{brand.footer}</p>
      </div>
    </>
  );
}
