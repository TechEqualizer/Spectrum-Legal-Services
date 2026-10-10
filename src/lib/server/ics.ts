// Calendar files (.ics): one date ("Add to calendar") or an organizer's
// every upcoming night (the feed fans subscribe to).

import type { FunnelEvent } from "@/data/funnel-types";

const HOUR = 60 * 60 * 1000;

/** Text escaped for a calendar file. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
/** 20261004T220000Z */
const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** A date as a calendar event: `slug` keeps its id stable, `link` (optional) is where it's sold. */
function vevent(slug: string, event: FunnelEvent, now: number, link?: string): string[] {
  // The moment itself, in UTC: calendar apps show it on the phone's own
  // clock, which is right for a calendar (8 PM Detroit is 5 PM in LA).
  const start = Date.parse(event.startsAt);
  const url = link ?? event.ticketUrl;
  return [
    "BEGIN:VEVENT",
    `UID:${esc(`${slug}-${event.id}`)}@reel-funnels`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    // How long it runs isn't stored; four hours covers most nights.
    `DTEND:${stamp(start + 4 * HOUR)}`,
    `SUMMARY:${esc(event.name)}`,
    ...(event.venue ? [`LOCATION:${esc(event.venue)}`] : []),
    `DESCRIPTION:${esc(`${event.price ? `${event.price}. ` : ""}Tickets: ${url}`)}`,
    `URL:${esc(url)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`${event.name} starts in 3 hours`)}`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

/** A calendar file with these dates. `name`: the calendar's name, for a feed people subscribe to. */
export function calendarFile(dates: { slug: string; event: FunnelEvent; link?: string }[], options: { name?: string; now?: number } = {}): string {
  const now = options.now ?? Date.now();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Showlnk//Event//EN",
    "CALSCALE:GREGORIAN",
    ...(options.name
      ? [
          "METHOD:PUBLISH",
          `X-WR-CALNAME:${esc(options.name)}`,
          // Calendar apps check back for new nights about every six hours.
          "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
          "X-PUBLISHED-TTL:PT6H",
        ]
      : []),
    ...dates.flatMap((d) => vevent(d.slug, d.event, now, d.link)),
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
