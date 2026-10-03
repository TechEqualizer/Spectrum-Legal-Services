import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  asAdmin,
  cookieOptions,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  signInWithPassword,
  signOut,
} from "@/lib/server/admin-auth";

// Signs an admin in. Only accounts listed in admin_users get a session.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password || email.length > 254 || password.length > 200) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const tokens = await signInWithPassword(email, password);
  if (typeof tokens === "object" && "problem" in tokens) {
    return NextResponse.json({ error: `Sign-in isn't working on this site. ${tokens.problem}` }, { status: 503 });
  }
  if (tokens === "invalid") {
    return NextResponse.json({ error: "That email and password don't match." }, { status: 401 });
  }

  const res = await asAdmin("/rest/v1/admin_users?select=email", tokens.access_token);
  const rows = res?.ok ? ((await res.json()) as unknown[]) : [];
  if (!rows.length) {
    await signOut(tokens.access_token);
    return NextResponse.json({ error: "This account doesn't have admin access." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, cookieOptions(tokens.expires_in));
  response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, cookieOptions(REFRESH_MAX_AGE));
  return response;
}
