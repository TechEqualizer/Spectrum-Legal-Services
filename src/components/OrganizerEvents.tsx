import BrandLogo from "@/components/BrandLogo";
import EventWhen from "@/components/EventWhen";
import SourceLink from "@/components/SourceLink";
import { titleFontClass } from "@/components/lookFonts";
import type { Funnel, FunnelEvent } from "@/data/funnel-types";
import { sceneMediaOf, thumbnailOf } from "@/lib/media";
import type { Organizer } from "@/lib/server/funnels";

/**
 * An organizer's permanent link when several events are coming up: one card
 * per night, soonest first. A card opens that night's story, where Tickets
 * waits; nothing here competes with it.
 */
export default function OrganizerEvents({
  organizer,
  events,
}: {
  organizer: Organizer;
  events: { funnel: Funnel; next: FunnelEvent }[];
}) {
  // The soonest night's look dresses the page.
  const lead = events[0].funnel;
  return (
    <main
      className="min-h-dvh bg-deep-navy px-4 pb-12 pt-[max(2.5rem,env(safe-area-inset-top))] text-white"
      style={lead.brand.theme as React.CSSProperties}
    >
      <div className="mx-auto max-w-md">
        <header>
          <BrandLogo brand={lead.brand} eager />
          {/* The logo already names the organizer; the heading names the page. */}
          <h1 className={`${titleFontClass(lead.cover.titleFont)} mt-8 text-3xl leading-tight text-white`}>
            <span className="sr-only">{organizer.name}: </span>Coming up
          </h1>
          <p className="mt-2 text-sm text-gray-300">Tap a night to watch, then get tickets.</p>
        </header>

        <ul role="list" className="mt-6 space-y-4">
          {events.map(({ funnel, next }) => {
            const poster = thumbnailOf(sceneMediaOf(funnel));
            const details = [next.venue, next.price].filter(Boolean).join(" · ");
            return (
              <li key={funnel.slug}>
                <SourceLink
                  href={`/f/${funnel.slug}`}
                  className="group block overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-accent"
                  style={funnel.brand.theme as React.CSSProperties}
                >
                  <div className="relative aspect-[16/10] bg-royal-blue">
                    {poster ? (
                      // eslint-disable-next-line @next/next/no-img-element -- organizer media from anywhere
                      <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
                    ) : (
                      // No flyer yet: the organizer's mark holds the place.
                      <div className="absolute inset-0 flex items-center justify-center opacity-80">
                        <BrandLogo brand={funnel.brand} />
                      </div>
                    )}
                  </div>
                  {/* The title sits below the picture: a flyer has words of its own. */}
                  <div className="flex min-h-16 items-center gap-3 px-4 py-4">
                    <div className="min-w-0 flex-1">
                      <h2 className={`${titleFontClass(funnel.cover.titleFont)} text-2xl leading-tight text-white`}>
                        {funnel.cover.hero?.title ?? funnel.brand.seriesLabel}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-sky-accent">
                        <EventWhen event={next} />
                        {next.status === "few_left" && " · Few left"}
                        {next.status === "sold_out" && " · Sold out"}
                      </p>
                      {details && <p className="mt-0.5 truncate text-sm text-gray-300">{details}</p>}
                    </div>
                    <svg className="h-5 w-5 flex-shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-white motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </div>
                </SourceLink>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
