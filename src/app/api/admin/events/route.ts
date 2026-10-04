import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { parseFunnelRecord } from "@/lib/funnel-record";
import { EVENT_SLUG, newEventFrom, type NewEventMode } from "@/lib/new-event";
import { applyPublication } from "@/lib/publication";
import { asAdmin, getAdmin, managesOrganizer } from "@/lib/server/admin-auth";
import { EVENT_FUNNELS_TAG, listEventFunnels, slugIsFree } from "@/lib/server/funnels";
import { getPublication } from "@/lib/server/publications";

// Adds an event for an organizer, made from one of their events: "fresh"
// (New event) keeps who they are and starts the words over; "copy"
// (Duplicate) keeps everything as published except the dates. Organizers add
// their own events; the database checks that too (manages_organizer).
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { source?: unknown; name?: unknown; slug?: unknown; mode?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const mode: NewEventMode = body?.mode === "copy" ? "copy" : "fresh";
  if (!name || name.length > 80) return NextResponse.json({ error: "Give the event a name (up to 80 characters)." }, { status: 400 });
  if (!EVENT_SLUG.test(slug)) {
    return NextResponse.json({ error: "Use lowercase letters, numbers and dashes for the link." }, { status: 400 });
  }

  // The source is one of an organizer's events; the new one joins that organizer.
  const source = (await listEventFunnels()).find(({ funnel }) => funnel.slug === body?.source);
  if (!source) return NextResponse.json({ error: "Choose one of your events to start from." }, { status: 400 });
  if (!managesOrganizer(admin, source.organizer)) {
    return NextResponse.json({ error: "Adding events isn't open to your account yet. Ask Event Reels to add it for you." }, { status: 403 });
  }
  if (!(await slugIsFree(slug))) {
    return NextResponse.json({ error: `/f/${slug} is taken. Try another link.` }, { status: 409 });
  }

  // Start from what visitors see now: the event with its published edits.
  const live = applyPublication(source.funnel, (await getPublication(source.funnel.slug))?.publication);
  const funnel = newEventFrom(live, { slug, name }, mode);
  const checked = parseFunnelRecord(JSON.parse(JSON.stringify(funnel)));
  if (typeof checked === "string") {
    console.error("[events] new event didn't check out:", checked);
    return NextResponse.json({ error: "Couldn't make that event. Try again." }, { status: 500 });
  }

  const res = await asAdmin("/rest/v1/event_funnels", admin.accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ slug, funnel_id: checked.id, organizer_slug: source.organizer, data: checked }),
  });
  if (res?.status === 409) return NextResponse.json({ error: `/f/${slug} is taken. Try another link.` }, { status: 409 });
  if (res?.status === 401 || res?.status === 403) {
    return NextResponse.json({ error: "Adding events isn't open to your account yet. Ask Event Reels to add it for you." }, { status: 403 });
  }
  if (!res?.ok) return NextResponse.json({ error: "Couldn't add the event. Try again." }, { status: 502 });
  revalidateTag(EVENT_FUNNELS_TAG, { expire: 0 });
  return NextResponse.json({ slug }, { status: 201 });
}
