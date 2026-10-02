"use client";

import { useState } from "react";
import ReelViewer from "@/components/ReelViewer";
import { defaultFunnel, getReel, type Reel } from "@/data/reels";
import { requestConsultation } from "@/lib/consultation";

// Only entry reels appear as cards; follow-up reels show up inside the funnel.
const entryReels = defaultFunnel.entryReelIds
  .map((id) => getReel(id))
  .filter((reel): reel is Reel => Boolean(reel));

export default function Reels() {
  // Each open gets a new key, so the viewer starts a fresh path every visit.
  const [visit, setVisit] = useState<{ reelId: string; key: number } | null>(
    null
  );

  const handleBook = (reel: Reel) => {
    setVisit(null);
    // Wait for the viewer to close and hand focus back before moving to the form.
    setTimeout(() => requestConsultation(reel.practiceArea, reel.id), 0);
  };

  return (
    <section
      id="videos"
      className="section-padding bg-deep-navy"
      aria-labelledby="videos-heading"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-10 md:mb-12">
          <h2
            id="videos-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
          >
            Know Your Rights
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Short videos from our attorneys explaining the questions clients
            ask us most.
          </p>
        </div>

        {/* Reel cards: a swipeable row on mobile, a grid on larger screens */}
        <ul
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-6"
          role="list"
        >
          {entryReels.map((reel) => (
            <li key={reel.id} className="w-40 flex-shrink-0 snap-start md:w-auto">
              <button
                type="button"
                onClick={() => setVisit({ reelId: reel.id, key: Date.now() })}
                className="group relative block aspect-[9/16] w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-deep-navy to-royal-blue text-left shadow-md transition-shadow duration-300 hover:shadow-xl"
                aria-label={`Watch: ${reel.title}`}
              >
                {reel.video?.poster && (
                  // eslint-disable-next-line @next/next/no-img-element -- poster is a plain thumbnail, sized by its card
                  <img
                    src={reel.video.poster}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                  <svg
                    className="ml-0.5 h-5 w-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M6 4l14 8-14 8V4z" />
                  </svg>
                </span>

                {!reel.video && (
                  <span className="absolute right-2 top-2 rounded-sm bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                    Coming soon
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-accent">
                    {reel.practiceArea}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug text-white">
                    {reel.title}
                  </p>
                  {reel.duration && (
                    <p className="mt-1 text-xs text-gray-300">{reel.duration}</p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-xs text-gray-400">
          These videos are general information, not legal advice. Every case is
          different, so talk to an attorney about yours.
        </p>
      </div>

      {visit && (
        <ReelViewer
          key={visit.key}
          funnel={defaultFunnel}
          startReelId={visit.reelId}
          onClose={() => setVisit(null)}
          onBook={handleBook}
        />
      )}
    </section>
  );
}
