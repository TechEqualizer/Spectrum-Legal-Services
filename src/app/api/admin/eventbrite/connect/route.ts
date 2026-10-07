import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookieOptions } from "@/lib/server/admin-auth";
import { authorizeUrl, isEventbriteConfigured, organizerForAdmin, STATE_COOKIE } from "@/lib/server/eventbrite";

// Settings → Eventbrite → Connect: sends the organizer's admin to Eventbrite
// to sign in there and allow Showlnk to see their orders. A one-time state,
// kept in an httpOnly cookie with the organizer, ties the answer to this
// browser and this organizer (checked in ./callback).

export async function GET(request: Request) {
  const settings = new URL("/admin/settings", request.url);
  const t = await organizerForAdmin(request);
  if (t.error) {
    if (t.error === "signin") return NextResponse.redirect(new URL("/admin/login", request.url), 303);
    settings.searchParams.set("eventbrite", "error");
    settings.searchParams.set("reason", "access");
    return NextResponse.redirect(settings, 303);
  }
  if (!isEventbriteConfigured()) {
    settings.searchParams.set("eventbrite", "error");
    settings.searchParams.set("reason", "not-configured");
    return NextResponse.redirect(settings, 303);
  }
  const state = randomBytes(24).toString("base64url");
  const redirectUri = `${new URL(request.url).origin}/api/admin/eventbrite/callback`;
  const response = NextResponse.redirect(authorizeUrl(state, redirectUri), 303);
  // Ten minutes to sign in to Eventbrite; Lax so it comes back with Eventbrite's redirect.
  response.cookies.set(STATE_COOKIE, `${state}.${t.organizer.slug}`, { ...cookieOptions(600), path: "/api/admin/eventbrite" });
  return response;
}
