import { upcomingEvents } from "@/lib/events";
import { calendarFile } from "@/lib/server/ics";
import { getOrganizer } from "@/lib/server/funnels";
import { getEventVersions, listOrganizerEventVersions } from "@/lib/server/publications";

// The calendar fans subscribe to (docs/plans/02-fans.md, step 5):
// /f/<organizer>/calendar.ics is every upcoming night of the organizer's
// events, kept up to date in the subscriber's calendar app; /f/<event>/calendar.ics
// is that event's. Public and the same for everyone, so it holds nothing
// personal and caches well. Each night links to its Showlnk link, tagged as
// coming from the calendar.

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const now = Date.now();
  const organizer = await getOrganizer(slug);
  const versions = organizer ? await listOrganizerEventVersions(organizer.slug) : [await getEventVersions(slug)].filter((v) => v !== undefined);
  if (!organizer && !versions.length) return new Response("Not found", { status: 404 });

  const origin = new URL(request.url).origin;
  const dates = versions
    .flatMap(({ live }) =>
      upcomingEvents(live, now).map((event) => ({
        slug: live.slug,
        // The date as visitors see it (a presale link is never in it: event_presales).
        event: event.presale ? { ...event, presale: undefined } : event,
        link: `${origin}/f/${live.slug}?src=calendar`,
      }))
    )
    .sort((a, b) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt));
  const name = organizer?.name ?? versions[0]!.live.brand.name;

  return new Response(calendarFile(dates, { name, now }), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${slug}.ics"`,
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
