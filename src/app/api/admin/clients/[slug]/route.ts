import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { asAdmin, getAdmin } from "@/lib/server/admin-auth";
import { EVENT_FUNNELS_TAG, ORGANIZERS_TAG } from "@/lib/server/funnels";
import { chargingSubscriptionOf, planTag } from "@/lib/server/plans";
import { cancelSubscription } from "@/lib/server/stripe";

// Archive or restore a client (Events → Archive, Archived → Restore). Only
// full admins; the database checks that too (supabase/migrations/
// *_archive_organizers.sql). Archived: their links answer Not found, their
// admins are signed out and can't edit, and a paid plan stops charging (it
// ends now in Stripe; any refund is done there by hand). Nothing is deleted:
// Restore brings them back, on Coming soon until they go live again.
// PATCH { archived: boolean } -> { slug, archived, canceled? }
export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!admin.slugs.includes("*")) return NextResponse.json({ error: "Only Showlnk can archive clients." }, { status: 403 });
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return NextResponse.json({ error: "No such client." }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { archived?: unknown } | null;
  if (typeof body?.archived !== "boolean") return NextResponse.json({ error: "Say whether to archive or restore." }, { status: 400 });
  const archived = body.archived;

  const res = await asAdmin(`/rest/v1/organizers?slug=eq.${slug}`, admin.accessToken, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ archived_at: archived ? new Date().toISOString() : null }),
  });
  if (!res?.ok) return NextResponse.json({ error: "Couldn't change that client. Try again." }, { status: res?.status === 403 ? 403 : 502 });
  const rows = (await res.json().catch(() => [])) as unknown[];
  if (!rows.length) return NextResponse.json({ error: "No such client." }, { status: 404 });

  // A paid plan stops charging now (the webhook then records it as canceled).
  let canceled: boolean | undefined;
  if (archived) {
    const subscription = await chargingSubscriptionOf(slug);
    if (subscription) canceled = Boolean(await cancelSubscription(subscription));
    else if (subscription === undefined) canceled = false;
  }

  revalidateTag(ORGANIZERS_TAG, { expire: 0 });
  revalidateTag(EVENT_FUNNELS_TAG, { expire: 0 });
  revalidateTag(planTag(slug), { expire: 0 });
  revalidatePath("/f/[slug]", "layout");
  return NextResponse.json({ slug, archived, ...(canceled !== undefined ? { canceled } : {}) });
}
