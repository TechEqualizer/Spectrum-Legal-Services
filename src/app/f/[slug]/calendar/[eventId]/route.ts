import { getLiveFunnel } from "@/lib/server/publications";

// "Add to calendar" for an event date: a calendar file (.ics) that phones
// and computers open in their own calendar app. Uses the published date.

const HOUR = 60 * 60 * 1000;

/** Text escaped for a calendar file. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
/** 20261004T220000Z */
const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; eventId: string }> }) {
  const { slug, eventId } = await params;
  const funnel = await getLiveFunnel(slug);
  const event = funnel?.events?.find((e) => e.id === eventId);
  if (!event) return new Response("Not found", { status: 404 });

  // The moment itself, in UTC: calendar apps show it on the phone's own
  // clock, which is right for a calendar (8 PM Detroit is 5 PM in LA).
  const start = Date.parse(event.startsAt);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Showlnk//Event//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${esc(`${slug}-${event.id}`)}@reel-funnels`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(start)}`,
    // How long it runs isn't stored; four hours covers most nights.
    `DTEND:${stamp(start + 4 * HOUR)}`,
    `SUMMARY:${esc(event.name)}`,
    ...(event.venue ? [`LOCATION:${esc(event.venue)}`] : []),
    `DESCRIPTION:${esc(`${event.price ? `${event.price}. ` : ""}Tickets: ${event.ticketUrl}`)}`,
    `URL:${esc(event.ticketUrl)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`${event.name} starts in 3 hours`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const filename = `${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event"}.ics`;
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
