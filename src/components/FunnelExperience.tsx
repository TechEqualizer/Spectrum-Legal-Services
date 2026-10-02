"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { JlfLogo } from "@/components/Brand";
import ReelViewer from "@/components/ReelViewer";
import { site } from "@/config/site";
import { getFunnelBySlug, getReel } from "@/data/reels";
import { trackReelEvent } from "@/lib/reel-tracking";

/**
 * The shareable funnel link. It opens on a "What happened?" screen; each
 * choice starts the reels at that topic. ?start=<reel id> skips straight to
 * a reel, which is how follow-up texts send someone their next video.
 */
export default function FunnelExperience({ slug }: { slug: string }) {
  const funnel = getFunnelBySlug(slug)!;
  const params = useSearchParams();
  const start = params.get("start");
  // Each visit gets a new key, so the viewer starts a fresh path every time.
  const [visit, setVisit] = useState<{ reelId: string; key: number } | null>(
    () => (start && getReel(start) ? { reelId: start, key: 0 } : null)
  );

  const entries = funnel.entryReelIds.filter((id) => getReel(id));

  return (
    <main id="main-content" className="min-h-dvh bg-deep-navy text-white">
      <FunnelCover>
        <div className="mt-8">
          <h1 className="text-3xl font-black uppercase tracking-tight text-white">
            {funnel.cover.heading}
          </h1>
          <p className="mt-2 text-gray-200">{funnel.cover.intro}</p>
        </div>
        <ul className="mt-6 grid gap-2" role="list">
          {entries.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setVisit({ reelId: id, key: Date.now() })}
                className="flex min-h-14 w-full items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 text-left font-semibold transition-colors hover:border-sky-accent hover:bg-white/10"
              >
                {funnel.cover.entryLabels[id] ?? getReel(id)!.practiceArea}
                <svg className="h-5 w-5 flex-shrink-0 text-sky-accent" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 4l14 8-14 8V4z" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6 border-t border-white/10 pt-6">
          <p className="text-sm text-gray-300">Rather talk to someone now?</p>
          <a
            href={site.phone.href}
            onClick={() => trackReelEvent(entries[0], "call_clicked")}
            className="mt-2 flex min-h-12 w-full items-center justify-center rounded-md bg-teal-accent px-5 font-semibold text-white shadow-md hover:brightness-110"
          >
            Call 24/7: {site.phone.display}
          </a>
        </div>
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
    </main>
  );
}

/** Shown while the page loads, before the topic choices can be used. */
export function FunnelSplash() {
  return (
    <main id="main-content" className="min-h-dvh bg-deep-navy text-white">
      <FunnelCover />
    </main>
  );
}

function FunnelCover({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {site.demoMode && (
        <p className="bg-black/40 px-4 py-1.5 text-center text-[11px] leading-snug text-gray-200">
          Concept preview prepared for {site.name}. Not the firm&apos;s
          official link.
        </p>
      )}
      <div className="mx-auto flex max-w-md flex-col px-5 pb-10 pt-6">
        <div className="flex items-center justify-between gap-4">
          <JlfLogo className="h-12 w-auto" eager />
          <p className="text-right text-xs leading-snug text-gray-300">
            {site.attorney.name}
            <br />
            {site.attorney.title}
          </p>
        </div>
        {children}
        <p className="mt-8 text-[11px] leading-snug text-gray-400">
          Attorney Advertising. General information only, not legal advice.
          Watching these videos does not create an attorney-client
          relationship. Main office: {site.mainOffice.street},{" "}
          {site.mainOffice.city}.
        </p>
      </div>
    </>
  );
}
