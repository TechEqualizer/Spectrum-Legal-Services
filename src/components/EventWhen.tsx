"use client";

import LocalDate from "@/components/LocalDate";
import { eventWhen, hasOwnClock, type EventClock } from "@/lib/event-time";

/**
 * An event's date and time on its own clock ("Sat, Oct 31 · 8 PM" for an
 * 8 PM Detroit night, wherever the viewer is), the same on the server and in
 * the browser. An older date with no zone of its own falls back to the
 * viewer's zone, formatted in the browser only.
 */
export default function EventWhen({ event, withTime = true }: { event: EventClock; withTime?: boolean }) {
  if (!hasOwnClock(event)) return <LocalDate iso={event.startsAt} withTime={withTime} />;
  return <time dateTime={event.startsAt}>{eventWhen(event, withTime)}</time>;
}
