import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { FAN_COOKIE, fanIdFromCookie, sameOrigin, unfollow } from "@/lib/server/fans";

// Unfollow an organizer, as the fan this browser is signed in as.
// POST { organizer }

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const fanId = fanIdFromCookie((await cookies()).get(FAN_COOKIE)?.value);
  if (!fanId) return NextResponse.json({ error: "You're not following anyone on this browser." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const organizer = typeof body.organizer === "string" ? body.organizer : "";
  if (!/^[a-z0-9-]{1,64}$/.test(organizer)) return NextResponse.json({ error: "Which organizer?" }, { status: 400 });
  const done = await unfollow(fanId, organizer);
  if (done === null) return NextResponse.json({ error: "Couldn't unfollow. Try again." }, { status: 502 });
  return NextResponse.json({ ok: true, wasFollowing: done });
}
