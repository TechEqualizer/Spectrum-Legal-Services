// An organizer's own names for its link tags (supabase/migrations/*_source_names.sql),
// called with the admin's sign-in so the database checks they manage the organizer.

import { asAdmin, type Admin } from "@/lib/server/admin-auth";

/** Tag to name; null when the admin may not see them, undefined if loading failed. */
export async function listSourceNames(admin: Admin, organizer: string): Promise<Record<string, string> | null | undefined> {
  const res = await asAdmin("/rest/v1/rpc/source_names_for", admin.accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_organizer: organizer }),
  });
  if (res && (res.status === 401 || res.status === 403)) return null;
  if (!res?.ok) {
    console.error("[source-names] source_names_for failed:", res?.status);
    return undefined;
  }
  const rows: unknown = await res.json().catch(() => undefined);
  if (!Array.isArray(rows)) return undefined;
  return Object.fromEntries(rows.map((r: { tag: string; name: string }) => [r.tag, r.name]));
}

/** Names a tag (an empty name forgets it); null when the admin may not, false if it failed. */
export async function setSourceName(admin: Admin, organizer: string, tag: string, name: string): Promise<boolean | null> {
  const res = await asAdmin("/rest/v1/rpc/set_source_name", admin.accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_organizer: organizer, p_tag: tag, p_name: name }),
  });
  if (res && (res.status === 401 || res.status === 403)) return null;
  return Boolean(res?.ok);
}
