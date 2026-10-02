"use client";

import { useEffect, useRef, useState } from "react";
import ReelViewer from "@/components/ReelViewer";
import { defaultFunnel, getReel, reels, type Reel } from "@/data/reels";
import { requestConsultation } from "@/lib/consultation";
import { Eyebrow, headingClass, Swoosh } from "@/components/Brand";

const ALL = "All";

// "All" shows the funnel's entry reels; a practice area shows every reel in
// it, follow-ups included. Opening any tile starts the funnel from that reel.
const entryReels = defaultFunnel.entryReelIds
  .map((id) => getReel(id))
  .filter((reel): reel is Reel => Boolean(reel));

const categories = [ALL, ...new Set(entryReels.map((r) => r.practiceArea))];

function reelsFor(category: string) {
  return category === ALL
    ? entryReels
    : reels.filter((r) => r.practiceArea === category);
}

export default function Reels() {
  const [category, setCategory] = useState(ALL);
  // Each open gets a new key, so the viewer starts a fresh path every visit.
  const [visit, setVisit] = useState<{ reelId: string; key: number } | null>(
    null
  );

  const handleBook = (reel: Reel) => {
    setVisit(null);
    // Wait for the viewer to close and hand focus back before moving to the form.
    setTimeout(() => requestConsultation(reel.practiceArea, reel.id), 0);
  };

  const visible = reelsFor(category);

  return (
    <section
      id="videos"
      className="section-padding bg-white"
      aria-labelledby="videos-heading"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
          <Eyebrow className="mb-2">Knowledge Center</Eyebrow>
          <h2
            id="videos-heading"
            className={`${headingClass} text-3xl md:text-4xl lg:text-5xl text-deep-navy`}
          >
            Injury Insights from Attorney Jeff
          </h2>
          <Swoosh className="mx-auto mt-2 mb-5 h-3 w-48 text-teal-accent md:w-64" />
          <p className="text-lg text-charcoal">
            Short videos on what to do after an accident, how insurance
            companies handle claims, and how to protect your case.
          </p>
        </div>

        <CategoryTabs value={category} onChange={setCategory} />

        {/* Reel grid: three square tiles per row at every size */}
        <ul
          className="mx-auto mt-6 grid max-w-4xl grid-cols-3 gap-1 md:mt-8 md:gap-4"
          role="list"
          aria-label={
            category === ALL ? "All videos" : `${category} videos`
          }
        >
          {visible.map((reel) => (
            <li key={reel.id}>
              <ReelTile
                reel={reel}
                onOpen={() => setVisit({ reelId: reel.id, key: Date.now() })}
              />
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-xs text-gray-500">
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

// Filter row: swipeable on phones, with a bar showing how far it has scrolled.
function CategoryTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (category: string) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(
    null
  );

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = row;
      setThumb(
        scrollWidth > clientWidth + 1
          ? {
              left: (scrollLeft / scrollWidth) * 100,
              width: (clientWidth / scrollWidth) * 100,
            }
          : null
      );
    };
    update();
    row.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => {
      row.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div>
      <div
        ref={rowRef}
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:justify-center md:px-0 [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filter videos by practice area"
      >
        {categories.map((cat) => {
          const active = cat === value;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onChange(cat)}
              aria-pressed={active}
              className={`flex-shrink-0 whitespace-nowrap border px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                active
                  ? "border-deep-navy bg-deep-navy text-white"
                  : "border-gray-300 bg-transparent text-gray-600 hover:border-deep-navy hover:text-deep-navy"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
      {thumb && (
        <div className="mt-3 h-1 bg-gray-200 md:hidden" aria-hidden="true">
          <div
            className="h-full bg-gray-400"
            style={{ marginLeft: `${thumb.left}%`, width: `${thumb.width}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ReelTile({ reel, onOpen }: { reel: Reel; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block aspect-square w-full overflow-hidden bg-gradient-to-br from-deep-navy to-royal-blue text-left"
      aria-label={`Watch: ${reel.title}`}
    >
      {reel.video?.poster ? (
        // eslint-disable-next-line @next/next/no-img-element -- poster is a plain thumbnail, sized by its tile
        <img
          src={reel.video.poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover grayscale transition duration-500 group-hover:scale-110 group-hover:grayscale-0"
        />
      ) : reel.video ? (
        // No poster yet: show the video's first frame as the thumbnail.
        <video
          src={`${reel.video.src}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover grayscale transition duration-500 group-hover:scale-110 group-hover:grayscale-0"
        />
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      <span className="absolute left-1/2 top-[38%] flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 md:h-12 md:w-12">
        <svg
          className="ml-0.5 h-4 w-4 text-white md:h-5 md:w-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M6 4l14 8-14 8V4z" />
        </svg>
      </span>

      {!reel.video && (
        <span className="absolute right-2 top-2 hidden rounded-sm bg-white/15 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm sm:inline">
          Coming soon
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-2 md:p-4">
        <p className="hidden text-[11px] font-bold uppercase tracking-wider text-sky-accent sm:block">
          {reel.practiceArea}
        </p>
        <p className="line-clamp-3 text-[11px] font-semibold leading-tight text-white sm:mt-1 sm:line-clamp-2 sm:text-sm md:text-base">
          {reel.title}
        </p>
      </div>
    </button>
  );
}
