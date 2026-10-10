import { NextResponse } from "next/server";
import { adminOrganizer, fanCounts, followOn, listFans, NO_STORE } from "@/lib/server/organizer-fans";

// Follower counts for Home and Results: numbers only, no one's email.
// GET ?slug=<event>&days=7|30|90&funnel=<the event's funnel id, for "from this link">

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const days = Number(params.get("days"));
  if (![7, 30, 90].includes(days)) return NextResponse.json({ error: "Choose 7, 30 or 90 days." }, { status: 400, headers: NO_STORE });
  const t = await adminOrganizer(params.get("slug") ?? "");
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: t.status, headers: NO_STORE });
  const fans = await listFans(t.admin, t.organizer.slug);
  if (fans === null) return NextResponse.json({ error: "Only the organizer's own admins can see its fans." }, { status: 403, headers: NO_STORE });
  if (!fans) return NextResponse.json({ error: "Couldn't load your fans." }, { status: 502, headers: NO_STORE });
  return NextResponse.json(
    { organizer: t.organizer.slug, followOn: followOn(t.organizer.slug), ...fanCounts(fans, days, params.get("funnel") ?? undefined) },
    { headers: NO_STORE }
  );
}
