// Presale links (docs/plans/02-fans.md, step 4). The window is published
// with the date; the link isn't: it lives in event_presales
// (supabase/migrations/*_presales.sql). Admins write and read their event's
// links with their own sign-in; the server reads them for followers.

import type { FunnelEvent } from "@/data/funnel-types";
import { asAdmin } from "@/lib/server/admin-auth";
import type { Publication } from "@/lib/publication";

const env = (name: string) => process.env[name]?.trim() || undefined;

/** The publication without presale links, and the links it had, by date. */
export function splitPresales(publication: Publication): { publication: Publication; links: { dateId: string; url: string }[] } {
  if (!publication.events?.some((e) => e.presale)) return { publication, links: [] };
  const links: { dateId: string; url: string }[] = [];
  const events = publication.events.map((e): FunnelEvent => {
    if (!e.presale) return e;
    if (e.presale.url) links.push({ dateId: e.id, url: e.presale.url });
    return { ...e, presale: { opensAt: e.presale.opensAt, endsAt: e.presale.endsAt } };
  });
  return { publication: { ...publication, events }, links };
}

/** Replaces an event's presale links (an admin who may publish it); false if that failed. */
export async function setPresales(slug: string, links: { dateId: string; url: string }[], accessToken: string): Promise<boolean> {
  const res = await asAdmin("/rest/v1/rpc/set_event_presales", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_slug: slug, p_presales: links }),
  });
  if (!res?.ok) console.error("[presales] couldn't save", res?.status, res && (await res.text()).slice(0, 200));
  return Boolean(res?.ok);
}

/** An event's presale links by date, for its admins; empty if none (or unreadable). */
export async function presalesForAdmin(slug: string, accessToken: string): Promise<Record<string, string>> {
  const res = await asAdmin("/rest/v1/rpc/event_presales_for", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_slug: slug }),
  });
  if (!res?.ok) return {};
  const rows = (await res.json()) as { date_id: string; url: string }[];
  return Object.fromEntries(rows.map((r) => [r.date_id, r.url]));
}

/** The publication with its presale links back in (for the editor). */
export function withPresaleLinks(publication: Publication, links: Record<string, string>): Publication {
  if (!publication.events) return publication;
  return {
    ...publication,
    events: publication.events.map((e) => (e.presale && links[e.id] ? { ...e, presale: { ...e.presale, url: links[e.id] } } : e)),
  };
}

/** Presale links for an event's dates (by funnel id), read with the secret key; null if unreachable. */
export async function presaleLinks(funnelId: string): Promise<Record<string, string> | null> {
  const url = env("SUPABASE_URL"), secret = env("SUPABASE_SECRET_KEY");
  if (!url || !secret) return null;
  try {
    const res = await fetch(`${url}/rest/v1/event_presales?funnel_id=eq.${encodeURIComponent(funnelId)}&select=date_id,url`, {
      headers: { apikey: secret, Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { date_id: string; url: string }[];
    return Object.fromEntries(rows.map((r) => [r.date_id, r.url]));
  } catch {
    return null;
  }
}
