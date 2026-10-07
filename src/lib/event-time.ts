// An event's date and time, always on the event's own clock: an 8 PM night
// in Detroit reads "8 PM" to a visitor in Los Angeles or London too, and on
// the server, so the page renders the same text everywhere.
//
// The clock is the event's timeZone (an IANA name like "America/Detroit").
// Without one, the offset written in startsAt ("...-04:00"); without that
// (older dates saved as UTC "Z"), the viewer's own zone, as before.

import type { FunnelEvent } from "@/data/funnel-types";

/** What's needed to place an event on its clock. */
export type EventClock = Pick<FunnelEvent, "startsAt" | "timeZone">;

const DAY = 24 * 60 * 60 * 1000;

const valid = new Map<string, boolean>();
/** Whether Intl knows this IANA time zone name (e.g. "America/Detroit"). */
export function isTimeZone(zone: unknown): zone is string {
  if (typeof zone !== "string" || !zone || zone.length > 64) return false;
  let ok = valid.get(zone);
  if (ok === undefined) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: zone });
      ok = true;
    } catch {
      ok = false;
    }
    valid.set(zone, ok);
  }
  return ok;
}

/** The zone this browser (or server) runs in, e.g. "America/Detroit". */
export function localTimeZone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isTimeZone(zone) ? zone : undefined;
  } catch {
    return undefined;
  }
}

/** The offset written in an ISO string, in minutes ("-04:00" -> -240); not "Z", which older dates used for any zone. */
function writtenOffset(iso: string): number | undefined {
  const m = /T.*([+-])(\d{2}):?(\d{2})$/.exec(iso);
  if (!m) return undefined;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(options);
  let f = formatters.get(key);
  if (!f) formatters.set(key, (f = new Intl.DateTimeFormat("en-US", options)));
  return f;
}

/**
 * The instant to format and the zone to format it in. A written offset
 * becomes a shifted instant read in UTC, which reads the same wall clock.
 */
function clockOf(e: EventClock): { at: Date; timeZone?: string } {
  const at = new Date(e.startsAt);
  if (isTimeZone(e.timeZone)) return { at, timeZone: e.timeZone };
  const offset = writtenOffset(e.startsAt);
  if (offset !== undefined) return { at: new Date(at.getTime() + offset * 60_000), timeZone: "UTC" };
  return { at };
}

/** The event's date with Intl options, on its clock: eventDate(e, { weekday: "long" }) -> "Saturday". */
export function eventDate(e: EventClock, options: Intl.DateTimeFormatOptions): string {
  const { at, timeZone } = clockOf(e);
  if (Number.isNaN(at.getTime())) return "";
  return formatter({ ...options, ...(timeZone ? { timeZone } : {}) }).format(at);
}

/** "8 PM" or "8:30 PM", on the event's clock. */
export function eventTime(e: EventClock): string {
  return eventDate(e, { hour: "numeric", minute: "2-digit" }).replace(":00", "");
}

/** The day of the month (31), on the event's clock. */
export function eventDayOfMonth(e: EventClock): number {
  return Number(eventDate(e, { day: "numeric" }));
}

/** The calendar date ("2026-10-31") that `ms` falls on in a zone (the viewer's without one). */
function dayIn(ms: number, timeZone: string | undefined): string {
  const parts = formatter({ year: "numeric", month: "2-digit", day: "2-digit", ...(timeZone ? { timeZone } : {}) }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** The event's calendar date on its own clock: "2026-10-31". */
export function eventDay(e: EventClock): string {
  const { at, timeZone } = clockOf(e);
  return Number.isNaN(at.getTime()) ? "" : dayIn(at.getTime(), timeZone);
}

/**
 * Calendar days from `now` to the event, counted on the event's clock: 0 on
 * the night itself (Tonight), 1 the day before (Tomorrow), and so on.
 */
export function eventDaysAway(e: EventClock, now: number): number {
  const { at, timeZone } = clockOf(e);
  const shift = at.getTime() - Date.parse(e.startsAt);
  const a = Date.parse(`${dayIn(at.getTime(), timeZone)}T00:00:00Z`);
  const b = Date.parse(`${dayIn(now + shift, timeZone)}T00:00:00Z`);
  return Math.round((a - b) / DAY);
}

/** The zone's offset from UTC at an instant, in milliseconds (Detroit in October: -4h). */
function offsetAt(timeZone: string, ms: number): number {
  const parts = formatter({
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return wall - Math.floor(ms / 1000) * 1000;
}

/**
 * A date ("2026-10-31") and time ("20:00") on a zone's clock, as an ISO
 * instant: ("2026-10-31", "20:00", "America/Detroit") -> "2026-11-01T00:00:00.000Z".
 * Without a valid zone, the local clock. Returns undefined for a bad date.
 */
export function zonedToInstant(date: string, time: string, timeZone?: string): string | undefined {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})/.exec(time || "00:00");
  if (!d || !t) return undefined;
  if (!isTimeZone(timeZone)) {
    const local = new Date(`${date}T${t[1]}:${t[2]}`);
    return Number.isNaN(local.getTime()) ? undefined : local.toISOString();
  }
  const wall = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  if (Number.isNaN(wall)) return undefined;
  // The offset at a first guess, then again at the answer, in case a
  // daylight-saving change falls between them.
  const first = offsetAt(timeZone, wall);
  let at = wall - first;
  const second = offsetAt(timeZone, at);
  if (second !== first) at = wall - second;
  return new Date(at).toISOString();
}

const pad = (n: number) => String(n).padStart(2, "0");

/** An ISO instant as a date ("2026-10-31") and time ("20:00") on a zone's clock (the local one without a zone). */
export function instantToZoned(iso: string, timeZone?: string): { date: string; time: string } {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return { date: "", time: "" };
  if (!isTimeZone(timeZone)) {
    return { date: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`, time: `${pad(at.getHours())}:${pad(at.getMinutes())}` };
  }
  const wall = new Date(at.getTime() + offsetAt(timeZone, at.getTime()));
  return {
    date: `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}`,
    time: `${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}`,
  };
}

/** A zone's place name, for "Detroit time": "America/Los_Angeles" -> "Los Angeles". */
export function zoneName(timeZone: string): string {
  if (timeZone === "UTC" || timeZone === "Etc/UTC") return "UTC";
  return (timeZone.split("/").pop() ?? timeZone).replace(/_/g, " ");
}

/** Whether the event carries its own clock (a zone, or an offset in startsAt), so every viewer and the server read the same time. */
export function hasOwnClock(e: EventClock): boolean {
  return isTimeZone(e.timeZone) || writtenOffset(e.startsAt) !== undefined;
}

/** "Sat, Oct 31 · 8 PM" on the event's clock (without the time: "Sat, Oct 31"). */
export function eventWhen(e: EventClock, withTime = true): string {
  const day = eventDate(e, { weekday: "short", month: "short", day: "numeric" });
  return withTime ? `${day} · ${eventTime(e)}` : day;
}
