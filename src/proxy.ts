import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  cookieOptions,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  refreshTokens,
  tokenExpiry,
} from "@/lib/server/admin-auth";

// Keeps admins signed in, and sends everyone else to the sign-in page.
// This is a convenience, not the lock: pages check the admin with Supabase
// (getAdmin), and Supabase's row-level security decides every write.

const OPEN = ["/admin/login", "/api/admin/login", "/api/admin/status"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (OPEN.includes(pathname)) return NextResponse.next();

  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  let refreshed: Awaited<ReturnType<typeof refreshTokens>> = null;

  // Refresh a minute before the sign-in token runs out.
  if (refresh && (!access || tokenExpiry(access) - 60 < Date.now() / 1000)) {
    refreshed = await refreshTokens(refresh);
    if (refreshed) {
      access = refreshed.access_token;
      request.cookies.set(ACCESS_COOKIE, refreshed.access_token);
      request.cookies.set(REFRESH_COOKIE, refreshed.refresh_token);
    } else {
      access = undefined;
    }
  }

  if (!access) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in again." }, { status: 401 });
    }
    const login = new URL("/admin/login", request.url);
    if (pathname !== "/admin") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const response = NextResponse.next({ request });
  if (refreshed) {
    response.cookies.set(ACCESS_COOKIE, refreshed.access_token, cookieOptions(refreshed.expires_in));
    response.cookies.set(REFRESH_COOKIE, refreshed.refresh_token, cookieOptions(REFRESH_MAX_AGE));
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
