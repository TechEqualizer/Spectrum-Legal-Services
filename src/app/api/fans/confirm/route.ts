import { NextResponse } from "next/server";
import { confirmFollow, FAN_COOKIE, FAN_COOKIE_MAX_AGE, fanCookieOptions, fanCookieValue } from "@/lib/server/fans";

// The confirm page's button (a plain form POST, so it works without
// JavaScript). Opening the emailed link only shows the page: mail scanners
// that open links can't use them up or follow anyone.

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");
  const done = await confirmFollow(token);
  const url = new URL("/fans/confirm", request.url);
  if (!done) {
    url.searchParams.set("token", token.slice(0, 64));
    return NextResponse.redirect(url, 303);
  }
  url.searchParams.set("following", done.organizer);
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(FAN_COOKIE, fanCookieValue(done.fanId), fanCookieOptions(FAN_COOKIE_MAX_AGE));
  return response;
}
