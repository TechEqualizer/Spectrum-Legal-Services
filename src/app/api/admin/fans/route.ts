import { NextResponse } from "next/server";
import { adminOrganizer, followOn, listFans, NO_STORE, removeFan } from "@/lib/server/organizer-fans";

// The Fans page: the organizer of the event `slug`, whether Follow is on for
// them, and everyone who has followed them. Personal data: never cached.
// GET ?slug=  ·  DELETE ?slug=&email= takes a fan off the list.

const NOT_YOURS = "Only the organizer's own admins can see its fans.";

export async function GET(request: Request) {
  const t = await adminOrganizer(new URL(request.url).searchParams.get("slug") ?? "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: t.status, headers: NO_STORE });
  const fans = await listFans(t.admin, t.organizer.slug);
  if (fans === null) return NextResponse.json({ error: NOT_YOURS }, { status: 403, headers: NO_STORE });
  if (!fans) return NextResponse.json({ error: "Couldn't load your fans. Reload to try again." }, { status: 502, headers: NO_STORE });
  return NextResponse.json({ organizer: { slug: t.organizer.slug, name: t.organizer.name }, followOn: followOn(t.organizer.slug), fans }, { headers: NO_STORE });
}

export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const t = await adminOrganizer(params.get("slug") ?? "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: t.status, headers: NO_STORE });
  const email = (params.get("email") ?? "").trim();
  if (!email) return NextResponse.json({ error: "Which fan?" }, { status: 400, headers: NO_STORE });
  const done = await removeFan(t.admin, t.organizer.slug, email);
  if (done === null) return NextResponse.json({ error: NOT_YOURS }, { status: 403, headers: NO_STORE });
  return NextResponse.json({ ok: true, removed: done }, { headers: NO_STORE });
}
