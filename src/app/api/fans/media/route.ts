import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { FAN_COOKIE, fanIdFromCookie, following, playableFanMedia } from "@/lib/server/fans";
import { organizerOf } from "@/lib/server/funnels";
import { getLiveFunnel } from "@/lib/server/publications";

// A link's fans-only reels, for a follower of its organizer: { reels: { [reel id]: media } },
// private files as addresses that work for an hour. GET ?slug=<event link>

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const fanId = fanIdFromCookie((await cookies()).get(FAN_COOKIE)?.value);
  if (!fanId) return NextResponse.json({ error: "Follow to watch." }, { status: 401, headers: NO_STORE });
  const [funnel, organizer] = await Promise.all([getLiveFunnel(slug), organizerOf(slug)]);
  if (!funnel || !organizer) return NextResponse.json({ error: "No such link." }, { status: 404, headers: NO_STORE });
  const follows = await following(fanId);
  if (!follows?.includes(organizer)) return NextResponse.json({ error: "Follow to watch." }, { status: 403, headers: NO_STORE });
  const reels = await playableFanMedia(funnel);
  if (!reels) return NextResponse.json({ error: "Couldn't load the reel. Try again." }, { status: 502, headers: NO_STORE });
  return NextResponse.json({ reels }, { headers: NO_STORE });
}
