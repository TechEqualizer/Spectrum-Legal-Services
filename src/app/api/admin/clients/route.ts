import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { parseFunnelRecord } from "@/lib/funnel-record";
import { EVENT_SLUG, newClientEvent } from "@/lib/new-event";
import { asAdmin, getAdmin } from "@/lib/server/admin-auth";
import { EVENT_FUNNELS_TAG, ORGANIZERS_TAG, slugIsFree } from "@/lib/server/funnels";

// A new client (Events → New client): an organizer with its own bio link
// (/f/<client>) and a first event to build from its flyer. Only full admins
// add clients; the database checks that too ("Full admins add organizers").
// Handing the client their own login is Settings → Accounts.
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!admin.slugs.includes("*")) return NextResponse.json({ error: "Only Showlnk can add clients." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const text = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
  const name = text(body?.name);
  const slug = text(body?.slug);
  const eventName = text(body?.eventName);
  const eventSlug = text(body?.eventSlug);
  const bad = (field: string, error: string, status = 400) => NextResponse.json({ field, error }, { status });
  if (!name || name.length > 120) return bad("name", "Give the client a name (up to 120 characters).");
  if (!EVENT_SLUG.test(slug)) return bad("slug", "Use lowercase letters, numbers and dashes for their link.");
  if (!eventName || eventName.length > 80) return bad("eventName", "Give their first event a name (up to 80 characters).");
  if (!EVENT_SLUG.test(eventSlug)) return bad("eventSlug", "Use lowercase letters, numbers and dashes for the event's link.");
  if (eventSlug === slug) return bad("eventSlug", "The event needs its own link, different from the client's.");
  const [slugFree, eventFree] = await Promise.all([slugIsFree(slug), slugIsFree(eventSlug)]);
  if (!slugFree) return bad("slug", `/f/${slug} is taken. Try another link.`, 409);
  if (!eventFree) return bad("eventSlug", `/f/${eventSlug} is taken. Try another link.`, 409);

  // Checked before anything is saved, so a bad event never leaves a client without one.
  const event = parseFunnelRecord(JSON.parse(JSON.stringify(newClientEvent(name, { slug: eventSlug, name: eventName }))));
  if (typeof event === "string") {
    console.error("[clients] first event didn't check out:", event);
    return NextResponse.json({ error: "Couldn't make that client. Try again." }, { status: 500 });
  }

  const post = (table: string, row: unknown) =>
    asAdmin(`/rest/v1/${table}`, admin.accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
  const org = await post("organizers", { slug, name });
  if (org?.status === 409) return bad("slug", `/f/${slug} is taken. Try another link.`, 409);
  if (!org?.ok) return NextResponse.json({ error: "Couldn't add the client. Try again." }, { status: org?.status === 403 ? 403 : 502 });
  revalidateTag(ORGANIZERS_TAG, { expire: 0 });

  const res = await post("event_funnels", { slug: eventSlug, funnel_id: event.id, organizer_slug: slug, data: event });
  if (!res?.ok) {
    // The client is there; their first event can be added from Events → New event.
    console.error("[clients] first event failed:", res?.status);
    return NextResponse.json({ error: `${name} was added, but their first event wasn't. Add it from New event.` }, { status: 502 });
  }
  revalidateTag(EVENT_FUNNELS_TAG, { expire: 0 });
  return NextResponse.json({ slug, eventSlug }, { status: 201 });
}
