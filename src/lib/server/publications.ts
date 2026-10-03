// Published funnel edits, read on the server. Cached per funnel and refreshed
// the moment the admin publishes (see /api/admin/publish).

import type { Funnel } from "@/data/funnel-types";
import { getFunnelById, getFunnelBySlug } from "@/data/funnels";
import { applyPublication, parsePublication, type Publication } from "@/lib/publication";

export const publicationTag = (slug: string) => `funnel-publication:${slug}`;

export type StoredPublication = { publication: Publication; publishedAt: string; publishedBy: string };

/** What's published for a funnel, or null (nothing published, or Supabase isn't set up). */
export async function getPublication(slug: string): Promise<StoredPublication | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const base = getFunnelBySlug(slug);
  if (!url || !key || !base) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/funnel_publications?slug=eq.${encodeURIComponent(slug)}&select=data,published_at,published_by`,
      { headers: { apikey: key }, cache: "force-cache", next: { tags: [publicationTag(slug)] } }
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

/** The funnel as visitors see it: built-in content with any published edits. */
export async function getLiveFunnelById(id: string): Promise<Funnel | undefined> {
  const base = getFunnelById(id);
  if (!base) return undefined;
  return applyPublication(base, (await getPublication(base.slug))?.publication);
}
