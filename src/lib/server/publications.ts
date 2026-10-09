// Published funnel edits, read on the server. Cached per funnel, refreshed
// the moment the admin publishes (see /api/admin/publish), and at most five
// minutes old otherwise.

import type { Funnel } from "@/data/funnel-types";
import { getFunnel, getFunnelById, listOrganizerEvents } from "@/lib/server/funnels";
import { applyPublication, parsePublication, type Publication } from "@/lib/publication";

export const publicationTag = (slug: string) => `funnel-publication:${slug}`;

export type StoredPublication = { publication: Publication; publishedAt: string; publishedBy: string };

/** What's published for a funnel, or null (nothing published, or Supabase isn't set up). */
export async function getPublication(slug: string): Promise<StoredPublication | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const base = await getFunnel(slug);
  if (!url || !key || !base) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/funnel_publications?slug=eq.${encodeURIComponent(slug)}&select=data,published_at,published_by`,
      // Refreshed at once on publish (by tag), and every few minutes in case
      // the row changed some other way (an edit made in the database itself).
      { headers: { apikey: key }, next: { tags: [publicationTag(slug)], revalidate: 300 } }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { data: unknown; published_at: string; published_by: string }[];
    if (!rows[0]) return null;
    // Checked again on the way out: a bad row shows the built-in funnel rather than breaking the link.
    const publication = parsePublication(rows[0].data, base);
    if (typeof publication === "string") return null;
    return { publication, publishedAt: rows[0].published_at, publishedBy: rows[0].published_by };
  } catch {
    return null;
  }
}

/**
 * An event three ways: as Showlnk built it (what "Take down published edits"
 * returns to), its published edits, and the two combined, which is what
 * visitors see. Readers outside the editor use `live`; only these helpers
 * combine the two.
 */
export type EventVersions = { base: Funnel; publication: Publication | null; live: Funnel };

/** A built event with its published edits, and the two combined. */
export async function versionsOf(base: Funnel): Promise<EventVersions> {
  const publication = (await getPublication(base.slug))?.publication ?? null;
  return { base, publication, live: applyPublication(base, publication) };
}

/** An event's versions by its link (slug). */
export async function getEventVersions(slug: string): Promise<EventVersions | undefined> {
  const base = await getFunnel(slug);
  return base ? versionsOf(base) : undefined;
}

/** Every event of an organizer, with its versions. */
export async function listOrganizerEventVersions(organizer: string): Promise<EventVersions[]> {
  return Promise.all((await listOrganizerEvents(organizer)).map(versionsOf));
}

/** The funnel as visitors see it, by its link (slug). */
export async function getLiveFunnel(slug: string): Promise<Funnel | undefined> {
  return (await getEventVersions(slug))?.live;
}

/** The funnel as visitors see it, by its id (stored with every lead and reel event). */
export async function getLiveFunnelById(id: string): Promise<Funnel | undefined> {
  const base = await getFunnelById(id);
  return base ? (await versionsOf(base)).live : undefined;
}
