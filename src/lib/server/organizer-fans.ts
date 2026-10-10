// An organizer's fans for their admins (docs/plans/02-fans.md, step 6): the
// database's organizer_fans and remove_fan, called with the admin's own
// sign-in, so the database checks they manage the organizer.

import { asAdmin, getAdmin, type Admin } from "@/lib/server/admin-auth";
import { followOn } from "@/lib/server/fans";
import { getOrganizer, organizerOf, type Organizer } from "@/lib/server/funnels";

export type OrganizerFan = {
  email: string;
  source_tag: string | null;
  funnel_id: string | null;
  confirmed_at: string;
  unfollowed_at: string | null;
};

export const NO_STORE = { "Cache-Control": "private, no-store" };

/** The signed-in admin and the organizer of the event `slug`, or why not. */
export async function adminOrganizer(slug: string): Promise<{ admin: Admin; organizer: Organizer } | { error: string; status: number }> {
  const admin = await getAdmin();
  if (!admin) return { error: "Sign in again.", status: 401 };
  const organizerSlug = await organizerOf(slug);
  const organizer = organizerSlug ? await getOrganizer(organizerSlug) : undefined;
  if (!organizer) return { error: "This event has no organizer, so no fans.", status: 404 };
  return { admin, organizer };
}

/** The organizer's fans, newest first; null when the admin may not see them, undefined if loading failed. */
export async function listFans(admin: Admin, organizer: string): Promise<OrganizerFan[] | null | undefined> {
  const res = await asAdmin("/rest/v1/rpc/organizer_fans", admin.accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_organizer: organizer }),
  });
  if (res && (res.status === 401 || res.status === 403)) return null;
  if (!res?.ok) {
    console.error("[fans] organizer_fans failed:", res?.status);
    return undefined;
  }
  const body: unknown = await res.json().catch(() => undefined);
  return Array.isArray(body) ? (body as OrganizerFan[]) : undefined;
}

/** Takes a fan off the organizer's list; null when the admin may not. */
export async function removeFan(admin: Admin, organizer: string, email: string): Promise<boolean | null> {
  const res = await asAdmin("/rest/v1/rpc/remove_fan", admin.accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_organizer: organizer, p_email: email }),
  });
  if (res && (res.status === 401 || res.status === 403)) return null;
  return res?.ok ? (await res.json().catch(() => false)) === true : false;
}

export { followOn };

export type FanCounts = {
  /** Following now. */
  following: number;
  /** New follows in the last `days` days, and the `days` before. */
  current: number;
  previous: number;
  /** The same, only those who followed from the event `funnelId`'s link. */
  fromLink?: { current: number; previous: number };
};

/** Counts for Home and Results: how many follow, and how many followed lately. */
export function fanCounts(fans: OrganizerFan[], days: number, funnelId?: string, now = Date.now()): FanCounts {
  const since = now - days * 864e5;
  const before = since - days * 864e5;
  const inWindow = (list: OrganizerFan[]) => {
    const at = list.map((f) => Date.parse(f.confirmed_at));
    return { current: at.filter((t) => t >= since).length, previous: at.filter((t) => t >= before && t < since).length };
  };
  return {
    following: fans.filter((f) => !f.unfollowed_at).length,
    ...inWindow(fans),
    ...(funnelId ? { fromLink: inWindow(fans.filter((f) => f.funnel_id === funnelId)) } : {}),
  };
}
