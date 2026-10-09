// Event dates as rows (table event_dates; docs/plans/01-events-as-records.md).
// Each event's rows mirror its dates as visitors see them: publishing, and
// taking published edits down, rewrite them in the same request.

import type { Funnel } from "@/data/funnel-types";
import { asAdmin } from "@/lib/server/admin-auth";
import { ebEventIdFromUrl } from "@/lib/server/eventbrite";

/** An event's dates as set_event_dates takes them: each date plus its Eventbrite event id. */
export function dateRows(live: Funnel) {
  return (live.events ?? []).map((date) => {
    const ebEventId = ebEventIdFromUrl(date.ticketUrl);
    return { ...date, ...(ebEventId ? { ebEventId } : {}) };
  });
}

/**
 * Rewrites an event's date rows to match `live` (the event as visitors now
 * see it). Nothing reads the rows yet, so a failure is logged rather than
 * failing the publish; the rows are checked against the published dates
 * before anything switches to them.
 */
export async function syncEventDates(slug: string, live: Funnel, accessToken: string) {
  const res = await asAdmin("/rest/v1/rpc/set_event_dates", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_slug: slug, p_dates: dateRows(live) }),
  });
  if (!res?.ok) console.error("set_event_dates failed", slug, res?.status, await res?.text().catch(() => ""));
}
