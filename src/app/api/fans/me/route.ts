import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { FAN_COOKIE, fanIdFromCookie, following } from "@/lib/server/fans";

// Who this browser follows: { following: [organizer slugs] }, empty for a
// visitor who hasn't confirmed a follow here.

export async function GET() {
  const fanId = fanIdFromCookie((await cookies()).get(FAN_COOKIE)?.value);
  const list = fanId ? await following(fanId) : [];
  return NextResponse.json({ following: list ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
