import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { FAN_COOKIE, fanCookieOptions, fanIdFromCookie, forget, sameOrigin } from "@/lib/server/fans";

// Delete everything about the fan this browser is signed in as (their
// email, follows and pending links), and sign the browser out.

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const fanId = fanIdFromCookie((await cookies()).get(FAN_COOKIE)?.value);
  if (!fanId) return NextResponse.json({ error: "You're not following anyone on this browser." }, { status: 401 });
  const done = await forget(fanId);
  if (done === null) return NextResponse.json({ error: "Couldn't delete. Try again." }, { status: 502 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(FAN_COOKIE, "", fanCookieOptions(0));
  return response;
}
