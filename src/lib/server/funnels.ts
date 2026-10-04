// Every funnel link's content, on the server: the built-in samples in code
// (src/data/funnels.ts) first, then organizers' events in the database
// (event_funnels). Database rows are checked on the way out and cached,
// refreshed at once when edited from the admin (by tag) and at most five
// minutes old otherwise.

import { getFunnelById as builtInById, getFunnelBySlug as builtInBySlug } from "@/data/funnels";
import type { Funnel } from "@/data/funnel-types";
import { parseFunnelRecord } from "@/lib/funnel-record";

export const funnelTag = (slug: string) => `event-funnel:${slug}`;
export const EVENT_FUNNELS_TAG = "event-funnels";

type Row = { slug: string; funnel_id: string; organizer_slug: string; data: unknown };

async function query(filter: string, tags: string[]): Promise<Row[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/event_funnels?${filter}select=slug,funnel_id,organizer_slug,data`, {
      headers: { apikey: key },
      next: { tags: [EVENT_FUNNELS_TAG, ...tags], revalidate: 300 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Row[];
  } catch {
    return [];
  }
}

/** A row as a funnel, or undefined if it doesn't check out (logged, so it can be fixed). */
function toFunnel(row: Row | undefined): Funnel | undefined {
  if (!row) return undefined;
  const funnel = parseFunnelRecord(row.data);
  if (typeof funnel === "string" || funnel.slug !== row.slug || funnel.id !== row.funnel_id) {
    console.error(`[funnels] ${row.slug} can't be shown: ${typeof funnel === "string" ? funnel : "slug or id doesn't match its row"}`);
    return undefined;
  }
  return funnel;
}

/** Rows as funnels, each wearing its organizer's profile photo (set in Settings) when it has one. */
async function withOrganizers(rows: Row[]): Promise<{ funnel: Funnel; organizer: string }[]> {
  const parsed = rows.flatMap((row) => {
    const funnel = toFunnel(row);
    return funnel ? [{ funnel, organizer: row.organizer_slug }] : [];
  });
  if (!parsed.length) return parsed;
  const photos = new Map((await listOrganizers()).map((o) => [o.slug, o.avatarUrl]));
  // Always the organizer's photo, never one stored with the event (a copy of an older event could carry one).
  return parsed.map(({ funnel, organizer }) => ({ funnel: { ...funnel, brand: { ...funnel.brand, avatar: photos.get(organizer) } }, organizer }));
}

/** The funnel at /f/<slug>, or undefined. */
export async function getFunnel(slug: string): Promise<Funnel | undefined> {
  const builtIn = builtInBySlug(slug);
  if (builtIn) return builtIn;
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return undefined;
  return (await withOrganizers(await query(`slug=eq.${slug}&`, [funnelTag(slug)])))[0]?.funnel;
}

/** The funnel with this id (stored with leads and reel events), or undefined. */
export async function getFunnelById(id: string): Promise<Funnel | undefined> {
  const builtIn = builtInById(id);
  if (builtIn) return builtIn;
  if (!/^[a-z0-9-]{1,80}$/.test(id)) return undefined;
  return (await withOrganizers(await query(`funnel_id=eq.${id}&`, [])))[0]?.funnel;
}

/** Every event funnel in the database, with its organizer (for the admin). */
export async function listEventFunnels(): Promise<{ funnel: Funnel; organizer: string }[]> {
  return withOrganizers(await query("order=slug&", []));
}

/** The organizer an event funnel belongs to (undefined for the built-in demos). */
export async function organizerOf(slug: string): Promise<string | undefined> {
  if (builtInBySlug(slug)) return undefined;
  return (await listEventFunnels()).find(({ funnel }) => funnel.slug === slug)?.organizer;
}

export type Organizer = { slug: string; name: string; avatarUrl?: string };
export const ORGANIZERS_TAG = "organizers";

async function organizers(filter: string): Promise<Organizer[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  try {
    // Every column (*), so this works before and after the photo column was added.
    const res = await fetch(`${url}/rest/v1/organizers?${filter}select=*`, {
      headers: { apikey: key },
      next: { tags: [ORGANIZERS_TAG], revalidate: 300 },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as { slug: string; name: string; avatar_url?: string | null }[];
    return rows.map((o) => ({ slug: o.slug, name: o.name, ...(o.avatar_url ? { avatarUrl: o.avatar_url } : {}) }));
  } catch {
    return [];
  }
}

/** Every organizer (for the admin). */
export const listOrganizers = () => organizers("order=name&");

/** The organizer whose permanent link is /f/<slug>, or undefined. */
export async function getOrganizer(slug: string): Promise<Organizer | undefined> {
  if (!/^[a-z0-9-]{1,64}$/.test(slug) || builtInBySlug(slug)) return undefined;
  return (await organizers(`slug=eq.${slug}&`))[0];
}

/** An organizer's events, as built (before published edits). */
export async function listOrganizerEvents(organizer: string): Promise<Funnel[]> {
  return (await withOrganizers(await query(`organizer_slug=eq.${organizer}&order=slug&`, []))).map(({ funnel }) => funnel);
}

/**
 * Whether /f/<slug> is free for a new event: not a demo, an organizer's
 * permanent link, or another event. Checked fresh, not from the cache.
 */
export async function slugIsFree(slug: string): Promise<boolean> {
  if (builtInBySlug(slug)) return false;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  const taken = await Promise.all(
    ["event_funnels", "organizers"].map((table) =>
      fetch(`${url}/rest/v1/${table}?slug=eq.${slug}&select=slug`, { headers: { apikey: key }, cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<unknown[]>) : Promise.reject()))
        .then((rows) => rows.length > 0)
    )
  ).catch(() => [true]);
  return !taken.some(Boolean);
}
