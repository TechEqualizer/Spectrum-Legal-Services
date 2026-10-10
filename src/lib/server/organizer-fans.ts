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
