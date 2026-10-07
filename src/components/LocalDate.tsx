"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * A date and time in the visitor's own time zone, e.g. when a lead came in.
 * Formatted in the browser only: the server's time zone (UTC) would differ.
 * Until then it holds its place without text. For an event's date, use
 * EventWhen, which shows it on the event's own clock.
 */
export default function LocalDate({ iso, withTime = true }: { iso: string; withTime?: boolean }) {
  const inBrowser = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (!inBrowser) return <span className="inline-block min-w-24" aria-hidden="true">&nbsp;</span>;
  const at = new Date(iso);
  const day = at.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(":00", "");
  return (
    <time dateTime={iso}>
      {day}
      {withTime && ` · ${time}`}
    </time>
  );
}
