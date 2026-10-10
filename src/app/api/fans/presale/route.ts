import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { presaleOpen } from "@/lib/events";
import { FAN_COOKIE, fanIdFromCookie, following } from "@/lib/server/fans";
import { organizerOf } from "@/lib/server/funnels";
import { presaleLinks } from "@/lib/server/presales";
import { getLiveFunnel } from "@/lib/server/publications";

// A link's presale links that are open right now, for a follower of its
// organizer: { dates: { [date id]: link } }. GET ?slug=<event link>

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const fanId = fanIdFromCookie((await cookies()).get(FAN_COOKIE)?.value);
  if (!fanId) return NextResponse.json({ error: "Follow for presale." }, { status: 401, headers: NO_STORE });
  const [funnel, organizer] = await Promise.all([getLiveFunnel(slug), organizerOf(slug)]);
  if (!funnel || !organizer) return NextResponse.json({ error: "No such link." }, { status: 404, headers: NO_STORE });
  if (!(await following(fanId))?.includes(organizer)) return NextResponse.json({ error: "Follow for presale." }, { status: 403, headers: NO_STORE });
  const now = Date.now();
  const open = (funnel.events ?? []).filter((e) => presaleOpen(e, now));
  if (!open.length) return NextResponse.json({ dates: {} }, { headers: NO_STORE });
  const links = await presaleLinks(funnel.id);
  if (!links) return NextResponse.json({ error: "Couldn't load the presale. Try again." }, { status: 502, headers: NO_STORE });
  return NextResponse.json({ dates: Object.fromEntries(open.flatMap((e) => (links[e.id] ? [[e.id, links[e.id]]] : []))) }, { headers: NO_STORE });
}
